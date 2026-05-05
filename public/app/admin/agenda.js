// ══════════════════════════════════════════════════════════
//  FILE UPLOAD HANDLING (BASE64)
// ══════════════════════════════════════════════════════════
function handleFileSelect(inputId, infoId) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  document.getElementById(infoId).textContent = '📎 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
}

function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const base64 = e.target.result.split(',')[1];
      resolve({
        content: base64,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      document.getElementById('spinner-label').textContent = 'Memproses unggahan (File siap)...';
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// ══════════════════════════════════════════════════════════
//  MODUL: AGENDA
// ══════════════════════════════════════════════════════════
function toggleDisposisiField() {
  const status = document.getElementById('ag-status');
  const card = document.getElementById('ag-disposisi-card');
  if (!status || !card) return;
  card.style.display = (status.value === 'Disposisi') ? 'block' : 'none';
}

async function submitAgenda() {
  const namaKegiatan = v('ag-nama');
  const tanggal = v('ag-tanggal');
  if (!namaKegiatan || !tanggal) { showToast('Nama Kegiatan dan Tanggal wajib diisi.', 'error'); return; }

  const status = v('ag-status') || 'Hadir';
  if (status === 'Disposisi' && !v('ag-disposisikepada')) {
    showToast('Field Didisposisikan Kepada wajib diisi!', 'error');
    return;
  }

  const jamMulai = v('ag-jam-mulai');
  const jamSelesai = v('ag-jam-selesai');
  let waktuStr = '';
  if (jamMulai) {
    waktuStr = jamMulai + (jamSelesai ? ' - ' + jamSelesai : ' - Selesai');
  } else if (jamSelesai) {
    waktuStr = '- ' + jamSelesai;
  }

  const data = {
    namaKegiatan: namaKegiatan, tanggal: tanggal,
    lokasi: v('ag-lokasi'), waktu: waktuStr, pakaian: v('ag-pakaian'),
    transit: v('ag-transit'), keterangan: v('ag-keterangan'),
    statusKehadiran: status, disposisiKepada: v('ag-disposisikepada'),
    disposisiDari: 'Bupati',
    sambutan: v('ag-sambutan'), sapaan: v('ag-sapaan'),
    cpNama: v('ag-cp-nama'), cpNoWa: v('ag-cp-wa'),
    latitude: v('ag-lat') || '', longitude: v('ag-lng') || ''
  };

  // Hitung berapa file yang akan diupload
  const fileEl = document.getElementById('ag-file');
  const fileSambutanEl = document.getElementById('ag-sambutan-file');
  const fileSapaanEl = document.getElementById('ag-sapaan-file');
  const hasFile = fileEl && fileEl.files[0];
  const hasSambutan = fileSambutanEl && fileSambutanEl.files[0];
  const hasSapaan = fileSapaanEl && fileSapaanEl.files[0];

  // Buat daftar langkah sesuai file yang ada
  const steps = ['Menyiapkan data agenda'];
  if (hasFile) steps.push('Membaca file lampiran');
  if (hasSambutan) steps.push('Membaca file sambutan');
  if (hasSapaan) steps.push('Membaca file sapaan');
  steps.push('Mengunggah ke server');
  steps.push('Menyimpan ke database');

  showSpinner('Menyimpan Agenda...', steps);
  let stepIdx = 0;

  try {
    setSpinnerStep(stepIdx++, steps.length); // Menyiapkan data

    let fd = null;
    if (hasFile) {
      setSpinnerStep(stepIdx++, steps.length);
      setSpinnerLabel('Membaca file lampiran...');
      fd = await readFileAsBase64(fileEl.files[0]);
    }

    if (hasSambutan) {
      setSpinnerStep(stepIdx++, steps.length);
      setSpinnerLabel('Membaca file sambutan...');
      data.fileSambutan = await readFileAsBase64(fileSambutanEl.files[0]);
    }

    if (hasSapaan) {
      setSpinnerStep(stepIdx++, steps.length);
      setSpinnerLabel('Membaca file sapaan...');
      data.fileSapaan = await readFileAsBase64(fileSapaanEl.files[0]);
    }

    setSpinnerStep(stepIdx++, steps.length);
    setSpinnerLabel('Mengunggah ke server...', 'Proses ini mungkin memakan waktu beberapa saat');
    const res = await callAPI('saveAgenda', { data: data, fileData: fd });

    setSpinnerStep(stepIdx, steps.length);
    setSpinnerLabel('Menyimpan ke database...');
    finishSpinner(steps.length);
    await new Promise(function (r) { setTimeout(r, 300); });
    hideSpinner();

    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['ag-tanggal', 'ag-nama', 'ag-lokasi', 'ag-jam-mulai', 'ag-jam-selesai', 'ag-pakaian', 'ag-transit', 'ag-keterangan', 'ag-disposisikepada', 'ag-sambutan', 'ag-sapaan', 'ag-cp-nama', 'ag-cp-wa', 'ag-lat', 'ag-lng']);
      if (fileEl) fileEl.value = '';
      if (fileSambutanEl) fileSambutanEl.value = '';
      if (fileSapaanEl) fileSapaanEl.value = '';
      const infoEl = document.getElementById('ag-file-info'); if (infoEl) infoEl.textContent = '';
      const infoSEl = document.getElementById('ag-sambutan-file-info'); if (infoSEl) infoSEl.textContent = '';
      const infoPEl = document.getElementById('ag-sapaan-file-info'); if (infoPEl) infoPEl.textContent = '';
      const prevEl = document.getElementById('ag-coord-preview'); if (prevEl) prevEl.style.display = 'none';
      if (document.getElementById('ag-status')) document.getElementById('ag-status').value = 'Hadir';
      if (document.getElementById('ag-disposisi-card')) document.getElementById('ag-disposisi-card').style.display = 'none';
      togglePanel('form-agenda');
      loadAgenda();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadAgenda() {
  try {
    const res = await callAPI('getAgenda', {});
    const timeline = document.getElementById('agenda-timeline');
    const emptyPanel = document.getElementById('agenda-empty-panel');
    if (!timeline) return;

    if (!res.success || !res.data.length) {
      _agendaSearchCache = [];
      timeline.innerHTML = '';
      if (emptyPanel) emptyPanel.style.display = 'block';
      // Reset search
      const searchEl = document.getElementById('agenda-search');
      if (searchEl) searchEl.value = '';
      return;
    }

    _agendaSearchCache = res.data;
    // Terapkan filter yang sedang aktif (jika ada)
    const searchEl = document.getElementById('agenda-search');
    const q = searchEl ? searchEl.value.trim() : '';
    if (q) {
      filterAgenda(q);
    } else {
      renderAgendaTimeline(res.data);
    }
  } catch (err) { console.error('loadAgenda error:', err); }
}

// ══════════════════════════════════════════════════════════
//  PENCARIAN AGENDA
// ══════════════════════════════════════════════════════════
// Cache data agenda untuk pencarian
let _agendaSearchCache = [];

function filterAgenda(query) {
  const q = (query || '').toLowerCase().trim();
  const timeline = document.getElementById('agenda-timeline');
  const emptyPanel = document.getElementById('agenda-empty-panel');
  if (!timeline) return;

  if (!q) {
    // Tampilkan semua — render ulang dari cache
    renderAgendaTimeline(_agendaSearchCache);
    return;
  }

  // Filter dari cache
  const filtered = _agendaSearchCache.filter(function (d) {
    const haystack = [
      d['Nama Kegiatan'], d['Tanggal'], d['Lokasi'], d['Waktu'],
      d['Pakaian'], d['Transit'], d['Keterangan'], d['Status Kehadiran'],
      d['CP Nama'], d['CP No WA'], d['Sambutan'], d['Sapaan']
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  if (!filtered.length) {
    timeline.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="bi bi-search" style="font-size:2.5rem;display:block;margin-bottom:12px;opacity:.4"></i><p>Tidak ada agenda yang cocok dengan "<strong>' + esc(query) + '</strong>"</p></div>';
    if (emptyPanel) emptyPanel.style.display = 'none';
    return;
  }
  renderAgendaTimeline(filtered);
}

/**
 * Render timeline agenda dari array data — dipakai oleh loadAgenda dan filterAgenda
 */
function renderAgendaTimeline(data) {
  const timeline = document.getElementById('agenda-timeline');
  const emptyPanel = document.getElementById('agenda-empty-panel');
  if (!timeline) return;

  if (!data || !data.length) {
    timeline.innerHTML = '';
    if (emptyPanel) emptyPanel.style.display = 'block';
    return;
  }
  if (emptyPanel) emptyPanel.style.display = 'none';

  const groups = {};
  data.forEach(function (d) {
    const tgl = d['Tanggal'] || 'Tanpa Tanggal';
    if (!groups[tgl]) groups[tgl] = [];
    groups[tgl].push(d);
  });

  const sortedDates = Object.keys(groups).sort(function (a, b) {
    return new Date(b) - new Date(a);
  });

  timeline.innerHTML = sortedDates.map(function (tgl) {
    const items = groups[tgl];
    const tglLabel = tgl === 'Tanpa Tanggal' ? tgl : new Date(tgl).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const cards = items.map(function (d) {
      const safeData = encodeURIComponent(JSON.stringify(d));
      const status = d['Status Kehadiran'] || '-';
      const statusColor = status === 'Hadir' ? '#16a34a' : (status === 'Disposisi' ? '#b45309' : '#e11d48');
      const statusIcon = status === 'Hadir' ? 'check-circle-fill' : (status === 'Disposisi' ? 'arrow-right-circle-fill' : 'x-circle-fill');

      let fileButtons = '';
      if (d['URL'] && d['URL'] !== '-' && d['URL'] !== '') {
        fileButtons += '<button onclick="openFileViewer(\'' + esc(d['URL']) + '\',\'' + esc(d['Nama File'] || 'Lampiran') + '\')" style="padding:4px 9px;font-size:.72rem;background:#10b98111;color:#10b981;border:1px solid #10b98133;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px"><i class="bi bi-paperclip"></i> Lampiran</button> ';
      }
      if (d['URL Sambutan'] && d['URL Sambutan'] !== '') {
        fileButtons += '<button onclick="openFileViewer(\'' + esc(d['URL Sambutan']) + '\',\'Sambutan\')" style="padding:4px 9px;font-size:.72rem;background:#3b82f611;color:#3b82f6;border:1px solid #3b82f633;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px"><i class="bi bi-file-text"></i> Sambutan</button> ';
      }
      if (d['URL Sapaan'] && d['URL Sapaan'] !== '') {
        fileButtons += '<button onclick="openFileViewer(\'' + esc(d['URL Sapaan']) + '\',\'Sapaan\')" style="padding:4px 9px;font-size:.72rem;background:#8b5cf611;color:#8b5cf6;border:1px solid #8b5cf633;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px"><i class="bi bi-people"></i> Sapaan</button>';
      }
      const hasSambutanTeks = d['Sambutan'] && d['Sambutan'].trim() !== '' && (!d['URL Sambutan'] || d['URL Sambutan'] === '');
      const hasSapaanTeks = d['Sapaan'] && d['Sapaan'].trim() !== '' && (!d['URL Sapaan'] || d['URL Sapaan'] === '');

      return '<div style="background:var(--panel-bg);border:1px solid var(--border);border-left:4px solid ' + statusColor + ';border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<div style="font-weight:700;font-size:.95rem;color:var(--text-main)">' + esc(d['Nama Kegiatan'] || '-') + '</div>' +
        '<span style="font-size:.75rem;color:' + statusColor + ';background:' + statusColor + '22;padding:3px 9px;border-radius:20px;white-space:nowrap;display:flex;align-items:center;gap:4px"><i class="bi bi-' + statusIcon + '"></i> ' + esc(status) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:.82rem;color:var(--text-muted)">' +
        (d['Waktu'] && d['Waktu'] !== '-' ? '<span><i class="bi bi-clock"></i> ' + esc(d['Waktu']) + '</span>' : '') +
        (d['Lokasi'] && d['Lokasi'] !== '-' ? '<span><i class="bi bi-geo-alt"></i> ' + esc(d['Lokasi']) + '</span>' : '') +
        (d['Pakaian'] && d['Pakaian'] !== '-' ? '<span><i class="bi bi-person-bounding-box"></i> ' + esc(d['Pakaian']) + '</span>' : '') +
        (d['CP Nama'] ? '<span><i class="bi bi-person-circle"></i> CP: ' + esc(d['CP Nama']) + (d['CP No WA'] ? ' · <a href="https://wa.me/' + String(d['CP No WA']).replace(/^'/, '').replace(/\D/g, '').replace(/^0/, '62') + '" target="_blank" style="color:#25D366">' + esc(String(d['CP No WA']).replace(/^'/, '')) + '</a>' : '') + '</span>' : '') +
        '</div>' +
        (d['Keterangan'] && d['Keterangan'] !== '-' ? '<div style="font-size:.8rem;color:var(--text-muted);font-style:italic">' + esc(d['Keterangan']) + '</div>' : '') +
        (hasSambutanTeks ? '<div style="font-size:.78rem;color:var(--text-muted);background:var(--body-bg);padding:6px 10px;border-radius:6px;border-left:3px solid #3b82f6"><i class="bi bi-file-text" style="color:#3b82f6"></i> <em>' + esc(d['Sambutan'].substring(0, 120)) + (d['Sambutan'].length > 120 ? '...' : '') + '</em></div>' : '') +
        (hasSapaanTeks ? '<div style="font-size:.78rem;color:var(--text-muted);background:var(--body-bg);padding:6px 10px;border-radius:6px;border-left:3px solid #8b5cf6"><i class="bi bi-people" style="color:#8b5cf6"></i> <em>' + esc(d['Sapaan'].substring(0, 120)) + (d['Sapaan'].length > 120 ? '...' : '') + '</em></div>' : '') +
        (fileButtons ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px">' + fileButtons + '</div>' : '') +
        '<div style="display:flex;gap:6px;margin-top:4px;justify-content:space-between;align-items:center">' +
        '<div style="display:flex;gap:6px;align-items:center">' +
        (d['Latitude'] && d['Longitude'] ? '<span style="font-size:.7rem;color:#1e6fd9;display:flex;align-items:center;gap:4px"><i class="bi bi-geo-alt-fill"></i>' + parseFloat(d['Latitude']).toFixed(5) + ', ' + parseFloat(d['Longitude']).toFixed(5) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:6px">' +
        (d['Latitude'] && d['Longitude'] ? '<button class="btn-link-custom" style="padding:4px 10px;font-size:.75rem;background:#1e6fd911;color:#1e6fd9;border:1px solid #1e6fd933" onclick="navigateTo(\'peta\');setTimeout(function(){ if(typeof focusAgendaOnMap === \'function\') focusAgendaOnMap(\'' + d['ID'] + '\') },500)"><i class="bi bi-map"></i> Peta</button>' : '') +
        '<button class="btn-warning-custom" style="padding:4px 10px;font-size:.75rem" onclick="openEditModal(\'Agenda\',\'' + safeData + '\')"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn-danger-custom" style="padding:4px 10px;font-size:.75rem" onclick="deleteItem(\'deleteAgenda\',\'' + d['ID'] + '\',loadAgenda)"><i class="bi bi-trash"></i></button>' +
        '</div></div>' +
        '</div>';
    }).join('');

    return '<div style="margin-bottom:24px">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
      '<div style="background:var(--primary);color:#fff;border-radius:8px;padding:8px 14px;font-weight:700;font-size:.85rem;white-space:nowrap">' +
      '<i class="bi bi-calendar3"></i> ' + tglLabel +
      '</div>' +
      '<div style="flex:1;height:2px;background:var(--border)"></div>' +
      '<div style="font-size:.78rem;color:var(--text-muted)">' + items.length + ' agenda</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' + cards + '</div>' +
      '</div>';
  }).join('');
}


// ══════════════════════════════════════════════════════
//  LEAFLET MAP: PICK MAP LOCATION
// ══════════════════════════════════════════════════════
let _pickMap = null;
let _pickMapContext = 'add';

function openPickMapModal(context) {
  _pickMapContext = context || 'add';
  const modal = document.getElementById('pick-map-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const titleEl = document.getElementById('pick-map-title');
  if (titleEl) {
    if (context === 'edit') {
      const namaKeg = document.getElementById('ed-ag-nama') ? document.getElementById('ed-ag-nama').value : '';
      titleEl.textContent = namaKeg ? 'Lokasi: ' + namaKeg : 'Pilih Lokasi di Peta';
    } else {
      titleEl.textContent = 'Pilih Lokasi di Peta';
    }
  }

  const lokasiVal = context === 'edit' ? (document.getElementById('ed-ag-lokasi') ? document.getElementById('ed-ag-lokasi').value : '') : (document.getElementById('ag-lokasi') ? document.getElementById('ag-lokasi').value : '');
  const searchEl = document.getElementById('pick-map-search');
  if (searchEl && lokasiVal) searchEl.value = lokasiVal;

  setTimeout(function () {
    if (_pickMap) {
      _pickMap.invalidateSize();
    } else {
      let initLat = -7.870481, initLng = 111.462307, initZoom = 15;

      const latId = context === 'edit' ? 'ed-ag-lat' : 'ag-lat';
      const lngId = context === 'edit' ? 'ed-ag-lng' : 'ag-lng';
      const existLat = parseFloat(document.getElementById(latId) ? document.getElementById(latId).value : '');
      const existLng = parseFloat(document.getElementById(lngId) ? document.getElementById(lngId).value : '');
      if (!isNaN(existLat) && !isNaN(existLng) && existLat !== 0) {
        initLat = existLat; initLng = existLng; initZoom = 16;
      }

      _pickMap = L.map('pick-map-div', { center: [initLat, initLng], zoom: initZoom, zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_pickMap);

      _pickMap.on('click', function (e) {
        _pickMap.setView(e.latlng, _pickMap.getZoom());
      });
    }

    _pickMap.on('moveend', _updatePickMapCoords);
    _updatePickMapCoords();
  }, 100);
}

function _updatePickMapCoords() {
  if (!_pickMap) return;
  const c = _pickMap.getCenter();
  const coordEl = document.getElementById('pick-map-coords');
  if (coordEl) coordEl.textContent = c.lat.toFixed(6) + ', ' + c.lng.toFixed(6);
}

function closePickMapModal() {
  const modal = document.getElementById('pick-map-modal');
  if (modal) modal.style.display = 'none';
}

function confirmPickMapCoords() {
  if (!_pickMap) return;
  const c = _pickMap.getCenter();
  const lat = c.lat.toFixed(7), lng = c.lng.toFixed(7);

  if (_pickMapContext === 'edit') {
    const latEl = document.getElementById('ed-ag-lat');
    const lngEl = document.getElementById('ed-ag-lng');
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;
    syncPickMapPreview('edit');
  } else {
    const latEl2 = document.getElementById('ag-lat');
    const lngEl2 = document.getElementById('ag-lng');
    if (latEl2) latEl2.value = lat;
    if (lngEl2) lngEl2.value = lng;
    syncPickMapPreview('add');
  }
  closePickMapModal();
  showToast('Koordinat berhasil dipilih: ' + lat + ', ' + lng, 'success');
}

function clearPickMapCoords() {
  if (_pickMapContext === 'edit') {
    const el1 = document.getElementById('ed-ag-lat'); if (el1) el1.value = '';
    const el2 = document.getElementById('ed-ag-lng'); if (el2) el2.value = '';
    const prev = document.getElementById('ed-ag-coord-preview'); if (prev) prev.style.display = 'none';
  } else {
    const el3 = document.getElementById('ag-lat'); if (el3) el3.value = '';
    const el4 = document.getElementById('ag-lng'); if (el4) el4.value = '';
    const prev2 = document.getElementById('ag-coord-preview'); if (prev2) prev2.style.display = 'none';
  }
  closePickMapModal();
}

function syncPickMapPreview(context) {
  if (context === 'edit') {
    const latEl = document.getElementById('ed-ag-lat');
    const lngEl = document.getElementById('ed-ag-lng');
    const prevEl = document.getElementById('ed-ag-coord-preview');
    const txtEl = document.getElementById('ed-ag-coord-preview-txt');
    if (!latEl || !lngEl || !prevEl) return;
    const lat = parseFloat(latEl.value), lng = parseFloat(lngEl.value);
    if (!isNaN(lat) && !isNaN(lng) && latEl.value && lngEl.value) {
      if (txtEl) txtEl.textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
      prevEl.style.display = 'flex';
    } else {
      prevEl.style.display = 'none';
    }
  } else {
    const latEl2 = document.getElementById('ag-lat');
    const lngEl2 = document.getElementById('ag-lng');
    const prevEl2 = document.getElementById('ag-coord-preview');
    const txtEl2 = document.getElementById('ag-coord-preview-txt');
    if (!latEl2 || !lngEl2 || !prevEl2) return;
    const lat2 = parseFloat(latEl2.value), lng2 = parseFloat(lngEl2.value);
    if (!isNaN(lat2) && !isNaN(lng2) && latEl2.value && lngEl2.value) {
      if (txtEl2) txtEl2.textContent = lat2.toFixed(6) + ', ' + lng2.toFixed(6);
      prevEl2.style.display = 'flex';
    } else {
      prevEl2.style.display = 'none';
    }
  }
}

function searchPickMapAddr() {
  const q = document.getElementById('pick-map-search');
  if (!q || !q.value.trim()) return;
  const query = encodeURIComponent(q.value.trim() + ', Ponorogo');

  showSpinner('Mencari lokasi...');
  fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + query + '&limit=1', {
    headers: { 'Accept-Language': 'id' }
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideSpinner();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
        if (_pickMap) {
          _pickMap.setView([lat, lng], 17, { animate: true });
        }
        showToast('Ditemukan: ' + data[0].display_name.substring(0, 60), 'success');
      } else {
        showToast('Lokasi tidak ditemukan. Coba kata kunci lain.', 'error');
      }
    })
    .catch(function () { hideSpinner(); showToast('Gagal mencari lokasi.', 'error'); });
}


// ══════════════════════════════════════════════════════════
//  INTEGRASI WHATSAPP UNTUK AGENDA
// ══════════════════════════════════════════════════════════
const WA_STATE = { users: [], message: '', tanggal: '' };

function openWAModal() {
  const modal = document.getElementById('wa-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  lockScroll();
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateEl = document.getElementById('wa-tanggal');
  if (dateEl) dateEl.value = today;
  loadWARecipients();
  loadWAPreview(today);
}

function closeWAModal() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'none';
  unlockScroll();
}

async function loadWARecipients() {
  // Tidak perlu load semua users, langsung render user yang aktif
  renderWARecipients();
}

function renderWARecipients() {
  const listEl = document.getElementById('wa-recipients-list');
  if (!listEl) return;

  // Ambil noWa dari APP.user (sudah diisi saat login dari sheet Users)
  const noWaRaw = (APP.user && APP.user.noWa) ? String(APP.user.noWa).replace(/^'/, '').trim() : '';

  if (noWaRaw) {
    listEl.innerHTML = '<div class="wa-rec-item">' +
      '<div class="wa-rec-info">' +
      '<div class="wa-rec-av">' + APP.user.nama.charAt(0).toUpperCase() + '</div>' +
      '<div><div style="font-weight:600;font-size:.85rem">' + esc(APP.user.nama) + ' (Anda)</div>' +
      '<div style="font-size:.72rem;color:var(--text-muted)">' + esc(APP.user.role) + ' · ' + esc(noWaRaw) + '</div></div>' +
      '</div>' +
      '<button class="btn-wa-sm" onclick="sendToWA(\'' + esc(noWaRaw) + '\')"><i class="bi bi-whatsapp"></i> Kirim</button>' +
      '</div>';
  } else {
    // Fallback: fetch dari sheet Users
    listEl.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted);padding:8px 0">Memuat nomor WA...</div>';
    callAPI('getUsers', {}).then(function (res) {
      if (res.success && res.data) {
        const me = res.data.find(function (u) { return u.username === APP.user.username; });
        const wa = me && me.noWa ? String(me.noWa).replace(/^'/, '').trim() : '';
        if (wa) {
          APP.user.noWa = wa; // cache untuk berikutnya
          listEl.innerHTML = '<div class="wa-rec-item">' +
            '<div class="wa-rec-info">' +
            '<div class="wa-rec-av">' + APP.user.nama.charAt(0).toUpperCase() + '</div>' +
            '<div><div style="font-weight:600;font-size:.85rem">' + esc(APP.user.nama) + ' (Anda)</div>' +
            '<div style="font-size:.72rem;color:var(--text-muted)">' + esc(APP.user.role) + ' · ' + esc(wa) + '</div></div>' +
            '</div>' +
            '<button class="btn-wa-sm" onclick="sendToWA(\'' + esc(wa) + '\')"><i class="bi bi-whatsapp"></i> Kirim</button>' +
            '</div>';
        } else {
          listEl.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted);padding:8px 0">Nomor WA belum diisi. Tambahkan di <a onclick="closeWAModal();navigateTo(\'pengaturan\')" style="color:var(--primary);cursor:pointer">Pengaturan → Kelola Pengguna</a>.</div>';
        }
      }
    }).catch(function () {
      listEl.innerHTML = '<div style="font-size:.78rem;color:var(--danger)">Gagal memuat data.</div>';
    });
  }

  // Sembunyikan tombol kirim semua
  const btnAll = document.getElementById('btn-send-all-wa');
  if (btnAll) btnAll.style.display = 'none';
}

async function loadWAPreview(tanggal) {
  if (!tanggal) return;
  WA_STATE.tanggal = tanggal;
  const previewEl = document.getElementById('wa-preview-box');
  if (!previewEl) return;

  previewEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">' +
    '<div style="width:28px;height:28px;border:2.5px solid var(--border);border-top-color:#25D366;border-radius:50%;animation:spin .75s linear infinite;margin:0 auto 8px"></div>' +
    'Memuat agenda...</div>';

  try {
    const agRes = await callAPI('getAgenda', {});
    const agendaList = (agRes.success ? agRes.data : []).filter(function (d) { return (d['Tanggal'] || '').substring(0, 10) === tanggal; });
    const message = formatAgendaWAMessage(agendaList, tanggal);
    WA_STATE.message = message;
    previewEl.innerHTML = '<pre class="wa-preview-pre">' + esc(message) + '</pre>';
  } catch (e) {
    previewEl.innerHTML = '<p style="color:var(--danger);font-size:.82rem;padding:12px">Gagal memuat: ' + e.message + '</p>';
  }
}

function formatAgendaWAMessage(agendaList, tanggal) {
  const kop2 = localStorage.getItem('senapati_kop2') || 'Bupati Ponorogo';
  const date = new Date(tanggal + 'T00:00:00');
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const hdr = HARI[date.getDay()] + ', ' + String(date.getDate()).padStart(2, '0') + ' ' + BULAN[date.getMonth()] + ' ' + date.getFullYear();

  // Baca status toggle — 1 toggle untuk semua extras
  const inclExtras = document.getElementById('wa-toggle-extras') ? document.getElementById('wa-toggle-extras').checked : true;

  let msg = '*Giat ' + kop2 + '*\n' + hdr + '\n';
  msg += '─'.repeat(30) + '\n\n';

  if (!agendaList.length) {
    return msg + '_Tidak ada agenda pada tanggal ini._';
  }

  agendaList.forEach(function (d, i) {
    const status = d['Status Kehadiran'] || 'Hadir';

    msg += '*' + (i + 1) + '. ' + (d['Nama Kegiatan'] || '-') + '*\n';
    msg += 'Waktu    : ' + (d['Waktu'] || 'ALL DAY') + '\n';
    if (d['Lokasi'] && d['Lokasi'] !== '-') msg += 'Tempat   : ' + d['Lokasi'] + '\n';
    if (d['Pakaian'] && d['Pakaian'] !== '-') msg += 'Pakaian  : ' + d['Pakaian'] + '\n';
    if (d['Transit'] && d['Transit'] !== '-') msg += 'Transit  : ' + d['Transit'] + '\n';
    if (d['Keterangan'] && d['Keterangan'] !== '-') msg += 'Ket.     : ' + d['Keterangan'] + '\n';

    // CP lengkap
    if (d['CP Nama'] && d['CP Nama'] !== '-' && d['CP Nama'] !== '') {
      const cpWa = d['CP No WA'] ? String(d['CP No WA']).replace(/^'/, '') : '';
      msg += 'CP       : ' + d['CP Nama'];
      if (cpWa) msg += ' (' + cpWa + ')';
      msg += '\n';
    }

    // Teks sambutan/sapaan (toggle)
    if (inclExtras) {
      if (d['Sambutan'] && d['Sambutan'].trim() !== '' && d['Sambutan'].length <= 200) {
        msg += 'Sambutan : ' + d['Sambutan'].trim() + '\n';
      }
      if (d['Sapaan'] && d['Sapaan'].trim() !== '' && d['Sapaan'].length <= 200) {
        msg += 'Sapaan   : ' + d['Sapaan'].trim() + '\n';
      }
    }

    // Link file (toggle per jenis)
    const links = [];
    if (inclExtras && d['URL'] && d['URL'] !== '-' && d['URL'] !== '') {
      const m = d['URL'].match(/[?&]id=([a-zA-Z0-9_-]+)/) || d['URL'].match(/\/d\/([a-zA-Z0-9_-]+)/);
      links.push('Lampiran     : ' + (m ? 'https://drive.google.com/file/d/' + m[1] + '/view' : d['URL']));
    }
    if (inclExtras && d['URL Sambutan'] && d['URL Sambutan'] !== '' && d['URL Sambutan'] !== '-') {
      const m2 = d['URL Sambutan'].match(/[?&]id=([a-zA-Z0-9_-]+)/) || d['URL Sambutan'].match(/\/d\/([a-zA-Z0-9_-]+)/);
      links.push('File Sambutan: ' + (m2 ? 'https://drive.google.com/file/d/' + m2[1] + '/view' : d['URL Sambutan']));
    }
    if (inclExtras && d['URL Sapaan'] && d['URL Sapaan'] !== '' && d['URL Sapaan'] !== '-') {
      const m3 = d['URL Sapaan'].match(/[?&]id=([a-zA-Z0-9_-]+)/) || d['URL Sapaan'].match(/\/d\/([a-zA-Z0-9_-]+)/);
      links.push('File Sapaan  : ' + (m3 ? 'https://drive.google.com/file/d/' + m3[1] + '/view' : d['URL Sapaan']));
    }
    if (links.length > 0) msg += links.join('\n') + '\n';

    msg += 'Status   : *' + status + '*\n';
    if (i < agendaList.length - 1) msg += '\n';
  });

  return msg.trimEnd();
}

function sendToWA(noWa, customMsg) {
  const message = customMsg || WA_STATE.message;
  if (!message) { showToast('Pilih tanggal dan muat preview terlebih dahulu.', 'error'); return; }
  if (!noWa) { showToast('No WA tidak tersedia.', 'error'); return; }

  const cleanWa = String(noWa).replace(/^'/, '');
  let num = cleanWa.replace(/\D/g, '');
  if (num.startsWith('0')) { num = '62' + num.substring(1); }
  const url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(message);
  window.open(url, '_blank');
}

function sendWACustom() {
  const noWa = document.getElementById('wa-custom-no') ? document.getElementById('wa-custom-no').value.trim() : '';
  if (!noWa) { showToast('Masukkan nomor WA terlebih dahulu.', 'error'); return; }
  sendToWA(noWa);
}

function sendAllWA() {
  if (!WA_STATE.message) { showToast('Pilih tanggal dan muat preview terlebih dahulu.', 'error'); return; }
  const withWA = WA_STATE.users.filter(function (u) { return u.noWa; });
  if (!withWA.length) { showToast('Tidak ada pengguna dengan No WA.', 'error'); return; }

  withWA.forEach(function (u, i) {
    setTimeout(function () { sendToWA(u.noWa); }, i * 800);
  });
  showToast('Membuka ' + withWA.length + ' tab WA... pastikan popup tidak diblokir.', 'info');
}

function openSetWAModal(id, nama, currentWa) {
  document.getElementById('wa-set-user-id').value = id;
  document.getElementById('wa-set-user-label').textContent = 'Set No WA untuk: ' + nama;
  document.getElementById('wa-set-nowa').value = currentWa || '';
  document.getElementById('wa-set-modal').style.display = 'flex';
}

function closeSetWAModal() {
  document.getElementById('wa-set-modal').style.display = 'none';
}

async function submitSetWA() {
  const id = document.getElementById('wa-set-user-id').value;
  const noWa = document.getElementById('wa-set-nowa').value.replace(/\D/g, '');

  if (!id) { showToast('ID user tidak valid.', 'error'); return; }
  if (!noWa) { showToast('Nomor WA tidak boleh kosong.', 'error'); return; }

  showSpinner('Menyimpan No WA...');
  try {
    const res = await callAPI('updateUserWA', { id: id, noWa: noWa });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      closeSetWAModal();
      loadUsers();
      loadWARecipients();
    } else showToast(res.message, 'error');
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

