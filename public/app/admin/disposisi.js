// ══════════════════════════════════════════════════════════
//  MODUL: DISPOSISI
// ══════════════════════════════════════════════════════════
let _dispCache = []; // cache untuk filter

async function submitDisposisi() {
  const kepada = v('disp-kepada');
  const namaKegiatan = v('disp-nama-kegiatan');
  const tanggal = v('disp-tanggal');
  if (!kepada) { showToast('Field Kepada wajib diisi.', 'error'); return; }
  if (!namaKegiatan) { showToast('Nama Kegiatan wajib diisi.', 'error'); return; }
  if (!tanggal) { showToast('Tanggal Kegiatan wajib diisi.', 'error'); return; }

  const jamMulai = v('disp-jam-mulai');
  const jamSelesai = v('disp-jam-selesai');
  let waktuStr = '';
  if (jamMulai) {
    waktuStr = jamMulai + (jamSelesai ? ' - ' + jamSelesai : ' - Selesai');
  } else if (jamSelesai) {
    waktuStr = '- ' + jamSelesai;
  }

  const data = {
    agendaId: v('disp-ref') || '-',
    dari: v('disp-dari') || 'Bupati',
    kepada: kepada,
    namaKegiatan: namaKegiatan,
    tanggal: tanggal,
    waktu: waktuStr,
    lokasi: v('disp-lokasi') || '',
    pakaian: v('disp-pakaian') || '',
    cpNama: v('disp-cp-nama') || '',
    cpNoWa: v('disp-cp-wa') || ''
  };

  showSpinner('Menyimpan Disposisi...');
  try {
    const res = await callAPI('saveDisposisi', { data: data });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['disp-ref', 'disp-kepada', 'disp-nama-kegiatan', 'disp-tanggal', 'disp-jam-mulai', 'disp-jam-selesai', 'disp-lokasi', 'disp-pakaian', 'disp-cp-nama', 'disp-cp-wa']);
      const dari = document.getElementById('disp-dari'); if (dari) dari.value = 'Bupati';
      togglePanel('form-disposisi');
      loadDisposisi();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadDisposisi() {
  try {
    const res = await callAPI('getDisposisi', {});
    const timelineEl = document.getElementById('disp-timeline');
    const emptyEl = document.getElementById('disp-empty-panel');
    if (!timelineEl) return;

    if (!res.success || !res.data.length) {
      _dispCache = [];
      timelineEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      animateCount('disp-stat-total', 0); animateCount('disp-stat-proses', 0); animateCount('disp-stat-selesai', 0);
      return;
    }

    _dispCache = res.data;
    if (emptyEl) emptyEl.style.display = 'none';

    const q = document.getElementById('disp-search') ? document.getElementById('disp-search').value.trim() : '';
    renderDisposisiCards(q ? _dispCache.filter(function (d) { return filterDispItem(d, q); }) : _dispCache);

    const total = res.data.length;
    const selesai = res.data.filter(function (d) { return d['Status'] === 'Selesai'; }).length;
    animateCount('disp-stat-total', total);
    animateCount('disp-stat-proses', total - selesai);
    animateCount('disp-stat-selesai', selesai);
    animateCount('disp-stat-selesai', selesai);
  } catch (err) { console.warn('Load disposisi error:', err); }
}

function filterDispItem(d, q) {
  const hay = [
    d['Kepada'], d['Dari'],
    d['Nama Kegiatan'], d['Tanggal'], d['Lokasi'], d['Waktu'],
    d['Pakaian'], d['CP Nama'], d['Referensi Agenda ID'], d['Status']
  ].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

function filterDisposisiCards(query) {
  const q = (query || '').trim();
  const timelineEl = document.getElementById('disp-timeline');
  const emptyEl = document.getElementById('disp-empty-panel');
  if (!timelineEl) return;
  if (!q) { renderDisposisiCards(_dispCache); return; }
  const filtered = _dispCache.filter(function (d) { return filterDispItem(d, q); });
  if (!filtered.length) {
    timelineEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="bi bi-search" style="font-size:2.5rem;display:block;margin-bottom:12px;opacity:.4"></i><p>Tidak ada disposisi yang cocok dengan "<strong>' + esc(query) + '</strong>"</p></div>';
    if (emptyEl) emptyEl.style.display = 'none';
    return;
  }
  renderDisposisiCards(filtered);
}

function renderDisposisiCards(data) {
  const timelineEl = document.getElementById('disp-timeline');
  const emptyEl = document.getElementById('disp-empty-panel');
  if (!timelineEl) return;

  if (!data || !data.length) {
    timelineEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // Kelompokkan per tanggal
  const groups = {};
  data.forEach(function (d) {
    const tgl = (d['Tanggal'] || '').substring(0, 10) || 'Tanpa Tanggal';
    if (!groups[tgl]) groups[tgl] = [];
    groups[tgl].push(d);
  });

  const sortedDates = Object.keys(groups).sort(function (a, b) {
    return new Date(b) - new Date(a);
  });

  timelineEl.innerHTML = sortedDates.map(function (tgl) {
    const items = groups[tgl];
    const tglLabel = tgl === 'Tanpa Tanggal' ? tgl
      : new Date(tgl).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const cards = items.map(function (d) {
      const safeData = encodeURIComponent(JSON.stringify(d));
      const status = d['Status'] || 'Diproses';
      const statusColor = status === 'Selesai' ? '#16a34a' : '#b45309';
      const statusIcon = status === 'Selesai' ? 'check-circle-fill' : 'arrow-right-circle-fill';

      // Ambil data kegiatan — dari field baru atau dari cache agenda
      const agendaId = d['Referensi Agenda ID'] || d['Referensi'] || '';
      let agendaData = null;
      if (agendaId && agendaId !== '-' && _agendaSearchCache.length) {
        agendaData = _agendaSearchCache.find(function (a) { return String(a['ID']) === String(agendaId); }) || null;
      }
      const namaKegiatan = d['Nama Kegiatan'] || (agendaData && agendaData['Nama Kegiatan']) || '-';
      const waktu = d['Waktu'] || (agendaData && agendaData['Waktu']) || '';
      const lokasi = d['Lokasi'] || (agendaData && agendaData['Lokasi']) || '';
      const pakaian = d['Pakaian'] || (agendaData && agendaData['Pakaian']) || '';
      const cpNama = d['CP Nama'] || (agendaData && agendaData['CP Nama']) || '';
      const cpWa = d['CP No WA'] || (agendaData && agendaData['CP No WA']) || '';
      const cpWaClean = String(cpWa).replace(/^'/, '');

      // Keterangan selesai & foto bukti
      const ketSelesai = d['Keterangan Selesai'] || '';
      const urlBukti = d['URL Bukti'] || '';

      return '<div style="background:var(--panel-bg);border:1px solid var(--border);border-left:4px solid ' + statusColor + ';border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px">' +
        // Header: nama kegiatan + badge status
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<div style="font-weight:700;font-size:.95rem;color:var(--text-main)">' + esc(namaKegiatan) + '</div>' +
        '<span style="font-size:.72rem;color:' + statusColor + ';background:' + statusColor + '22;padding:3px 9px;border-radius:20px;white-space:nowrap;display:flex;align-items:center;gap:4px;flex-shrink:0"><i class="bi bi-' + statusIcon + '"></i> ' + esc(status) + '</span>' +
        '</div>' +
        // Kepada
        '<div style="font-size:.85rem;color:var(--text-main)"><i class="bi bi-people-fill" style="color:#7c3aed;margin-right:5px"></i>Kepada: <strong>' + esc(d['Kepada'] || '-') + '</strong></div>' +
        // Detail kegiatan
        '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.82rem;color:var(--text-muted)">' +
        (waktu ? '<span><i class="bi bi-clock"></i> ' + esc(waktu) + '</span>' : '') +
        (lokasi ? '<span><i class="bi bi-geo-alt"></i> ' + esc(lokasi) + '</span>' : '') +
        (pakaian ? '<span><i class="bi bi-person-bounding-box"></i> ' + esc(pakaian) + '</span>' : '') +
        (cpNama ? '<span><i class="bi bi-person-circle"></i> CP: ' + esc(cpNama) + (cpWaClean ? ' · <a href="https://wa.me/' + cpWaClean.replace(/\D/g, '').replace(/^0/, '62') + '" target="_blank" style="color:#25D366">' + esc(cpWaClean) + '</a>' : '') + '</span>' : '') +
        '</div>' +
        // Instruksi dihapus
        // Keterangan selesai (jika ada)
        (status === 'Selesai' && ketSelesai ? '<div style="font-size:.8rem;color:#16a34a;background:rgba(22,163,74,.08);padding:6px 10px;border-radius:6px;border-left:3px solid #16a34a"><i class="bi bi-check-circle-fill" style="color:#16a34a"></i> ' + esc(ketSelesai) + '</div>' : '') +
        // Foto bukti (jika ada)
        (urlBukti ? '<div style="margin-top:2px"><button onclick="openFileViewer(\'' + esc(urlBukti) + '\',\'Foto Bukti\')" style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;background:rgba(22,163,74,.1);color:#16a34a;border:1px solid rgba(22,163,74,.25);border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-camera-fill"></i> Lihat Foto Bukti</button></div>' : '') +
        // Dari + Ref
        '<div style="font-size:.75rem;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap">' +
        '<span>Dari: ' + esc(d['Dari'] || 'Bupati') + '</span>' +
        (agendaId && agendaId !== '-' ? '<span>Ref: ' + esc(agendaId) + '</span>' : '') +
        '</div>' +
        // Aksi
        '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:2px;flex-wrap:wrap">' +
        (status !== 'Selesai' ? '<button onclick="openSelesaiModal(\'' + esc(d['ID']) + '\',\'' + esc(namaKegiatan) + '\')" style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-check-lg"></i> Selesai</button>' : '') +
        '<button onclick="openDispWAModal(\'' + safeData + '\')" style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-whatsapp"></i> Kirim WA</button>' +
        '<button class="btn-warning-custom" style="padding:4px 10px;font-size:.75rem" onclick="openEditModal(\'Disposisi\',\'' + safeData + '\')"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn-danger-custom" style="padding:4px 10px;font-size:.75rem" onclick="deleteItem(\'deleteDisposisi\',\'' + d['ID'] + '\',loadDisposisi)"><i class="bi bi-trash"></i></button>' +
        '</div>' +
        '</div>';
    }).join('');

    return '<div style="margin-bottom:24px">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
      '<div style="background:#7c3aed;color:#fff;border-radius:8px;padding:8px 14px;font-weight:700;font-size:.85rem;white-space:nowrap">' +
      '<i class="bi bi-calendar3"></i> ' + tglLabel +
      '</div>' +
      '<div style="flex:1;height:2px;background:var(--border)"></div>' +
      '<div style="font-size:.78rem;color:var(--text-muted)">' + items.length + ' disposisi</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' + cards + '</div>' +
      '</div>';
  }).join('');
}


// ══════════════════════════════════════════════════════════
//  MODUL: SELESAI DISPOSISI
// ══════════════════════════════════════════════════════════
let _selesaiDispId = null;

function openSelesaiModal(dispId, namaKegiatan) {
  _selesaiDispId = dispId;
  const sub = document.getElementById('disp-selesai-subtitle');
  if (sub) sub.textContent = namaKegiatan || 'Konfirmasi penyelesaian disposisi';
  const ketEl = document.getElementById('disp-selesai-ket');
  const fotoEl = document.getElementById('disp-selesai-foto');
  const infoEl = document.getElementById('disp-selesai-foto-info');
  if (ketEl) ketEl.value = '';
  if (fotoEl) fotoEl.value = '';
  if (infoEl) infoEl.textContent = '';
  const modal = document.getElementById('disp-selesai-modal');
  if (modal) modal.style.display = 'flex';
}

function closeSelesaiModal() {
  const modal = document.getElementById('disp-selesai-modal');
  if (modal) modal.style.display = 'none';
  _hideSelesaiLoading();
  _selesaiDispId = null;
}

async function submitSelesaiDisposisi() {
  if (!_selesaiDispId) return;
  const keterangan = document.getElementById('disp-selesai-ket') ? document.getElementById('disp-selesai-ket').value.trim() : '';
  const fotoEl = document.getElementById('disp-selesai-foto');
  const hasFoto = fotoEl && fotoEl.files[0];

  const steps = ['Menyiapkan data'];
  if (hasFoto) steps.push('Membaca foto bukti');
  steps.push('Mengunggah ke server');

  // Tampilkan loading overlay di dalam modal
  _showSelesaiLoading('Menandai selesai...', 'Mohon tunggu sebentar', steps, 0);

  try {
    let fileData = null;
    if (hasFoto) {
      _showSelesaiLoading('Membaca foto bukti...', 'Memproses gambar', steps, 1);
      fileData = await readFileAsBase64(fotoEl.files[0]);
    }
    _showSelesaiLoading('Mengunggah ke server...', 'Proses ini mungkin memakan waktu beberapa saat', steps, hasFoto ? 2 : 1);
    const res = await callAPI('selesaiDisposisi', { id: _selesaiDispId, keterangan: keterangan, fileData: fileData });

    _showSelesaiLoading('Selesai!', 'Data berhasil disimpan', steps, steps.length);
    await new Promise(function (r) { setTimeout(r, 400); });
    _hideSelesaiLoading();

    if (res.success) {
      showToast('Disposisi ditandai selesai!', 'success');
      closeSelesaiModal();
      loadDisposisi();
    } else {
      showToast(res.message, 'error');
    }
  } catch (e) {
    _hideSelesaiLoading();
    showToast('Error: ' + e.message, 'error');
  }
}

function _showSelesaiLoading(label, sub, steps, activeIdx) {
  const overlay = document.getElementById('disp-selesai-loading');
  const lblEl = document.getElementById('disp-selesai-loading-label');
  const subEl = document.getElementById('disp-selesai-loading-sub');
  const stepsEl = document.getElementById('disp-selesai-loading-steps');
  if (!overlay) return;

  if (lblEl) lblEl.textContent = label || 'Memproses...';
  if (subEl) subEl.textContent = sub || '';

  if (stepsEl && steps && steps.length) {
    stepsEl.innerHTML = steps.map(function(s, i) {
      var isDone = i < activeIdx;
      var isActive = i === activeIdx;
      var color = isDone ? 'var(--success,#16a34a)' : isActive ? 'var(--primary,#1e6fd9)' : 'var(--text-muted,#64748b)';
      var icon = isDone
        ? '<i class="bi bi-check-circle-fill" style="color:var(--success,#16a34a)"></i>'
        : isActive
          ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary,#1e6fd9);animation:pulseDot .8s ease-in-out infinite;flex-shrink:0"></div>'
          : '<div style="width:8px;height:8px;border-radius:50%;background:var(--border,#e2e8f0);flex-shrink:0"></div>';
      return '<div style="display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:' + (isActive ? '700' : '500') + ';color:' + color + '">'
        + icon + '<span>' + s + '</span></div>';
    }).join('');
  }

  overlay.style.display = 'flex';
}

function _hideSelesaiLoading() {
  var overlay = document.getElementById('disp-selesai-loading');
  if (overlay) overlay.style.display = 'none';
}

// ══════════════════════════════════════════════════════════
//  MODUL: WA DISPOSISI (per kegiatan)
// ══════════════════════════════════════════════════════════
let _dispWAData = null; // data disposisi yang sedang dibuka

async function openDispWAModal(dataEnc) {
  const d = JSON.parse(decodeURIComponent(dataEnc));
  _dispWAData = d;

  const modal = document.getElementById('disp-wa-modal');
  if (!modal) return;

  const sub = document.getElementById('disp-wa-subtitle');
  if (sub) sub.textContent = 'Kepada: ' + (d['Kepada'] || '-');

  // Load ajudan + pejabat secara paralel
  await Promise.all([_loadAjudanForModal(), _ensurePejabatCache()]);

  _refreshDispWAPreview();

  // ── Bagian 1: Akun aktif (Anda) ──
  const recipEl = document.getElementById('disp-wa-recipients');
  if (recipEl) {
    const noWaRaw = (APP.user && APP.user.noWa) ? String(APP.user.noWa).replace(/^'/, '').trim() : '';

    const _buildRecipHtml = function (wa) {
      const hasWa = wa && wa !== '—' && wa.trim() !== '';

      // Bagian 1: akun aktif
      let html = '<div style="margin-bottom:10px">' +
        '<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Akun Anda</div>' +
        '<div class="wa-rec-item">' +
        '<div class="wa-rec-info">' +
        '<div class="wa-rec-av">' + APP.user.nama.charAt(0).toUpperCase() + '</div>' +
        '<div><div style="font-weight:600;font-size:.85rem">' + esc(APP.user.nama) + ' (Anda)</div>' +
        '<div style="font-size:.72rem;color:var(--text-muted)">' + esc(APP.user.role) + (hasWa ? ' · ' + esc(wa) : ' · <em>No WA belum diisi</em>') + '</div></div>' +
        '</div>' +
        (hasWa
          ? '<button class="btn-wa-sm" onclick="sendDispWA(\'' + esc(wa) + '\')"><i class="bi bi-whatsapp"></i> Kirim</button>'
          : '<a onclick="closeDispWAModal();navigateTo(\'pengaturan\')" style="font-size:.72rem;color:var(--primary);cursor:pointer;text-decoration:underline">Isi No WA</a>') +
        '</div>' +
        '</div>';

      // Bagian 2: pejabat tujuan disposisi — hanya pejabat yang dipilih (d['Kepada'])
      // Cari di cache pejabat berdasarkan jabatan yang cocok dengan d['Kepada']
      const kepada = (d['Kepada'] || '').trim().toLowerCase();
      const pejabatTujuan = kepada ? _pejabatCache.find(function(p) {
        const jabatan = (p['Jabatan'] || '').trim().toLowerCase();
        return jabatan === kepada || jabatan.includes(kepada) || kepada.includes(jabatan);
      }) : null;

      if (pejabatTujuan) {
        const pWa = String(pejabatTujuan['No WA'] || '').replace(/^'/, '').replace(/\D/g, '').trim();
        if (pWa.length >= 8) {
          const pLabel = pejabatTujuan['Jabatan'] || '-';
          const pNama  = pejabatTujuan['Nama'] ? ' · ' + pejabatTujuan['Nama'] : '';
          const pWaDisplay = String(pejabatTujuan['No WA'] || '').replace(/^'/, '').trim();
          html += '<div style="margin-bottom:10px">' +
            '<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Kirim ke Pejabat Tujuan</div>' +
            '<div class="wa-rec-item">' +
            '<div class="wa-rec-info">' +
            '<div class="wa-rec-av" style="background:linear-gradient(135deg,#0891b2,#0e7490)">' + (pLabel.charAt(0) || 'P') + '</div>' +
            '<div><div style="font-weight:600;font-size:.85rem">' + esc(pLabel) + '</div>' +
            '<div style="font-size:.72rem;color:var(--text-muted)">' + esc(pWaDisplay) + esc(pNama) + '</div></div>' +
            '</div>' +
            '<button class="btn-wa-sm" onclick="sendDispWA(\'' + esc(pWaDisplay) + '\')"><i class="bi bi-whatsapp"></i> Kirim</button>' +
            '</div>' +
            '</div>';
        }
      }

      return html;
    };

    recipEl.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted);padding:8px 0">Memuat...</div>';

    if (noWaRaw) {
      recipEl.innerHTML = _buildRecipHtml(noWaRaw);
    } else {
      callAPI('getUsers', {}).then(function (res) {
        if (res.success && res.data) {
          const me = res.data.find(function (u) { return u.username === APP.user.username; });
          const wa = me && me.noWa ? String(me.noWa).replace(/^'/, '').trim() : '';
          if (wa) {
            APP.user.noWa = wa;
            recipEl.innerHTML = _buildRecipHtml(wa);
          } else {
            recipEl.innerHTML = _buildRecipHtml('—');
          }
        }
      }).catch(function () {
        recipEl.innerHTML = '<div style="font-size:.78rem;color:var(--danger)">Gagal memuat data.</div>';
      });
    }
  }

  modal.style.display = 'flex';
  lockScroll();
}

// Pastikan cache pejabat terisi (tanpa force-reload jika sudah ada)
async function _ensurePejabatCache() {
  if (_pejabatCache.length) return;
  try {
    const res = await callAPI('getPejabatDisposisi', {});
    _pejabatCache = (res.success ? res.data : []);
    _populatePejabatDatalist();
  } catch (e) { _pejabatCache = []; }
}

async function _loadAjudanForModal() {
  // Refresh cache jika kosong
  if (!_ajudanCache.length) {
    try {
      const res = await callAPI('getAjudan', {});
      _ajudanCache = (res.success ? res.data : []);
    } catch (e) { _ajudanCache = []; }
  }

  const listEl = document.getElementById('disp-wa-ajudan-list');
  if (!listEl) return;

  if (!_ajudanCache.length) {
    listEl.innerHTML = '<div style="font-size:.78rem;color:var(--text-muted);font-style:italic">Belum ada data ajudan. Tambahkan di <a onclick="closeDispWAModal();navigateTo(\'pengaturan\');setTimeout(function(){setPgTab(\'pg-ajudan\')},200)" style="color:var(--primary);cursor:pointer">Pengaturan → Data Ajudan</a>.</div>';
    return;
  }

  listEl.innerHTML = _ajudanCache.map(function (a) {
    const noWa = String(a['No WA'] || '').replace(/^'/, '');
    const label = esc(a['Nama'] || '-') + (noWa ? ' <span style="color:var(--text-muted);font-size:.75rem">(' + esc(noWa) + ')</span>' : '');
    return '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0">' +
      '<input type="checkbox" class="disp-ajudan-cb" data-nama="' + esc(a['Nama'] || '') + '" data-nowa="' + esc(noWa) + '" onchange="_refreshDispWAPreview()" style="width:16px;height:16px;cursor:pointer;accent-color:#7c3aed" />' +
      '<span style="font-size:.85rem;color:var(--text-main)">' + label + '</span>' +
      '</label>';
  }).join('');
}

function _refreshDispWAPreview() {
  if (!_dispWAData) return;
  const previewEl = document.getElementById('disp-wa-preview-box');
  if (previewEl) {
    const msg = formatDispWAMessage(_dispWAData);
    previewEl.innerHTML = '<pre class="wa-preview-pre">' + esc(msg) + '</pre>';
  }
}

function closeDispWAModal() {
  const modal = document.getElementById('disp-wa-modal');
  if (modal) modal.style.display = 'none';
  unlockScroll();
  _dispWAData = null;
}

function formatDispWAMessage(d) {
  // Cari data agenda terkait dari cache jika ada
  const agendaId = d['Referensi Agenda ID'] || d['Referensi'] || '';
  let agendaData = null;
  if (agendaId && agendaId !== '-' && _agendaSearchCache.length) {
    agendaData = _agendaSearchCache.find(function (a) { return String(a['ID']) === String(agendaId); }) || null;
  }

  const kepada = d['Kepada'] || '-';
  const dari = d['Dari'] || 'Bupati';

  // Baca ajudan yang dicentang dari modal
  const selectedAjudan = [];
  document.querySelectorAll('.disp-ajudan-cb:checked').forEach(function (cb) {
    const nama = cb.getAttribute('data-nama') || '';
    const noWa = cb.getAttribute('data-nowa') || '';
    if (nama) selectedAjudan.push({ nama: nama, noWa: noWa });
  });

  // Format ajudan: "Basith (085xxx)" atau "Basith (085xxx) dan Ahmad (081xxx)"
  let ajudanStr = '';
  if (selectedAjudan.length === 0) {
    ajudanStr = '................................';
  } else {
    ajudanStr = selectedAjudan.map(function (a) {
      return a.nama + (a.noWa ? ' (' + a.noWa + ')' : '');
    }).join(' dan ');
  }

  // Format tanggal — prioritas: field Tanggal di disposisi, lalu dari agenda
  const tglRaw = (d['Tanggal'] && d['Tanggal'].length >= 10 && d['Tanggal'] !== new Date().toISOString().substring(0, 10))
    ? d['Tanggal']
    : ((agendaData && agendaData['Tanggal']) ? agendaData['Tanggal'] : (d['Tanggal'] || ''));
  let tglFormatted = '-';
  if (tglRaw) {
    const dt = new Date(tglRaw + (tglRaw.includes('T') ? '' : 'T00:00:00'));
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    tglFormatted = HARI[dt.getDay()] + ', ' + String(dt.getDate()).padStart(2, '0') + ' ' + BULAN[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  // Ambil detail kegiatan — dari field disposisi dulu, fallback ke agenda
  const namaKegiatan = d['Nama Kegiatan'] || (agendaData && agendaData['Nama Kegiatan']) || '-';
  const waktu = d['Waktu'] || (agendaData && agendaData['Waktu']) || '';
  const lokasi = d['Lokasi'] || (agendaData && agendaData['Lokasi']) || '';
  const pakaian = d['Pakaian'] || (agendaData && agendaData['Pakaian']) || '';
  const cpNama = d['CP Nama'] || (agendaData && agendaData['CP Nama']) || '';
  const cpWa = String(d['CP No WA'] || (agendaData && agendaData['CP No WA']) || '').replace(/^'/, '');

  let msg = 'Kepada Yth.\n';
  msg += kepada + '\n\n';
  msg += 'Mohon izin meneruskan arahan pimpinan, dengan hormat disampaikan bahwa dimohon untuk dapat hadir pada kegiatan berikut:\n\n';
  msg += 'Hari/Tanggal : ' + tglFormatted + '\n';
  msg += 'Acara        : ' + namaKegiatan + '\n';
  if (waktu && waktu !== '-') msg += 'Waktu        : ' + waktu + '\n';
  if (lokasi && lokasi !== '-') msg += 'Tempat       : ' + lokasi + '\n';
  if (pakaian && pakaian !== '-') msg += 'Pakaian      : ' + pakaian + '\n';

  // Contact Person dari disposisi/agenda (jika ada)
  if (cpNama) {
    msg += '\nContact Person   : ' + cpNama;
    if (cpWa) msg += ' (' + cpWa + ')';
    msg += '\n';
  }

  // Ajudan yang bertugas
  msg += 'Ajudan bertugas  : ' + ajudanStr + '\n';

  msg += '\nDemikian disampaikan, atas perhatian dan kehadirannya diucapkan terima kasih.';
  return msg;
}

function sendDispWA(noWa) {
  if (!_dispWAData) return;
  const msg = formatDispWAMessage(_dispWAData);
  const cleanWa = String(noWa).replace(/^'/, '');
  let num = cleanWa.replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.substring(1);
  window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank');
}

function sendDispWACustom() {
  const noWa = document.getElementById('disp-wa-custom-no') ? document.getElementById('disp-wa-custom-no').value.trim() : '';
  if (!noWa) { showToast('Masukkan nomor WA terlebih dahulu.', 'error'); return; }
  sendDispWA(noWa);
}

// ══════════════════════════════════════════════════════════
//  HELPER: RENDER TABEL SURAT GENERIC
// ══════════════════════════════════════════════════════════
function renderSuratTable(tbodyId, res, cols, badgeClass, deleteAction, reloadFn) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const colCount = cols.length + 3;
  if (!res.success || !res.data.length) {
    tbody.innerHTML = '<tr class="no-data"><td colspan="' + colCount + '"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data</td></tr>'; return;
  }

  tbody.innerHTML = res.data.map(function (d, i) {
    const cells = cols.map(function (col) {
      const val = d[col] || '-';
      if (col === 'Kategori') return '<td><span class="badge-cat ' + badgeClass + '">' + esc(val) + '</span></td>';
      if (col === 'Tanggal') return '<td>' + fmtDate(val) + '</td>';
      return '<td>' + esc(val) + '</td>';
    }).join('');

    const shName = 'Surat Masuk';
    const safeData = encodeURIComponent(JSON.stringify(d));
    const url = d['URL'] || d['File URL'];
    const lampiran = url ? '<button class="btn-link-custom" style="padding:4px 10px;font-size:0.75rem" onclick="openFileViewer(\'' + url + '\', \'Lampiran\')"><i class="bi bi-eye"></i> Lihat</button>' : '<span style="color:var(--text-muted);font-size:.78rem">-</span>';

    return '<tr><td>' + (i + 1) + '</td>' + cells + '<td>' + lampiran + '</td><td class="action-col" style="display:flex;gap:5px"><button class="btn-warning-custom" onclick="openEditModal(\'' + shName + '\', \'' + safeData + '\')"><i class="bi bi-pencil"></i></button><button class="btn-danger-custom" onclick="deleteItem(\'' + deleteAction + '\',\'' + d['ID'] + '\',' + reloadFn.name + ')"><i class="bi bi-trash"></i></button></td></tr>';
  }).join('');
}


