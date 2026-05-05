// ══════════════════════════════════════════════════════════
//  PENGATURAN SISTEM (DB, USERS, FORMAT CETAK)
// ══════════════════════════════════════════════════════════
function setGenTab(tabId) {
  document.querySelectorAll('#page-generator .custom-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('#page-generator .tab-content').forEach(function (c) { c.style.display = 'none'; });

  const activeBtn = document.getElementById('tab-' + tabId);
  const contentBlock = document.getElementById('content-' + tabId);
  if (activeBtn) activeBtn.classList.add('active');
  if (contentBlock) contentBlock.style.display = 'block';

  // Saat kembali ke tab Buat Surat, pastikan step 1 yang tampil
  if (tabId === 'gen-buat') {
    // Hanya reset ke step 1 jika belum ada template yang dipilih
    if (!TEMPLATE_STATE.selected) {
      wizardGoTo(1);
    }
  }
}

function setArsipTab(tabId) {
  document.querySelectorAll('#page-arsip .custom-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('#page-arsip .tab-content').forEach(function (c) { c.style.display = 'none'; });

  const activeBtn = document.getElementById('tab-' + tabId);
  const contentBlock = document.getElementById('content-' + tabId);
  if (activeBtn) activeBtn.classList.add('active');
  if (contentBlock) contentBlock.style.display = 'block';

  // Update header action button sesuai tab aktif
  const headerBtn = document.getElementById('btn-arsip-tambah');
  if (headerBtn) {
    if (tabId === 'arsip-masuk') {
      headerBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Tambah Surat Masuk';
      headerBtn.onclick = function() { togglePanel('form-masuk'); };
    } else {
      headerBtn.innerHTML = '<i class="bi bi-cloud-upload"></i> Upload Arsip';
      headerBtn.onclick = function() { togglePanel('arsip-form-panel'); };
    }
  }
}

function setPgTab(tabId) {
  document.querySelectorAll('#page-pengaturan .custom-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('#page-pengaturan .tab-content').forEach(function (c) { c.style.display = 'none'; });

  const activeBtn = document.getElementById('tab-' + tabId);
  const contentBlock = document.getElementById('content-' + tabId);
  if (activeBtn) activeBtn.classList.add('active');
  if (contentBlock) contentBlock.style.display = 'block';

  if (tabId === 'pg-cetak') loadKopSettings();
  if (tabId === 'pg-ajudan') loadAjudan();
  if (tabId === 'pg-pejabat') _ensurePejabatCache(); // preload cache saja, modal dibuka manual
}

function loadKopSettings() {
  const fields = {
    'set-kop1': ['senapati_kop1', 'PEMERINTAH KABUPATEN PONOROGO'],
    'set-kop2': ['senapati_kop2', 'BUPATI PONOROGO'],
    'set-kop3': ['senapati_kop3', 'Jl. Alun-Alun Utara No. 1, Ponorogo'],
    'set-kop-telp': ['senapati_kop_telp', ''],
    'set-ttd-kota': ['senapati_ttd_kota', 'Ponorogo'],
    'set-ttd-jabatan': ['senapati_ttd_jabatan', 'Bupati Ponorogo,'],
    'set-ttd-nama': ['senapati_ttd_nama', '________________________'],
    'set-ttd-nip': ['senapati_ttd_nip', '........................................'],
    'set-logo-kiri-size': ['senapati_logo_kiri_size', '90'],
    'set-logo-kanan-size': ['senapati_logo_kanan_size', '90'],
    'set-logo-size': ['senapati_logo_size', '90'],
    'set-font-size': ['senapati_font_size', '12'],
    'set-penutup': ['senapati_penutup', 'Demikian Surat ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.']
  };

  Object.keys(fields).forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = localStorage.getItem(fields[id][0]) || fields[id][1];
  });

  const logoPos = document.getElementById('set-logo-pos');
  if (logoPos) logoPos.value = localStorage.getItem('senapati_logo_pos') || 'left';

  // Restore preview logo
  const kiriData = localStorage.getItem('senapati_logo_kiri_data');
  if (kiriData) {
    const kiriPrev = document.getElementById('set-logo-kiri-preview');
    const kiriImg = document.getElementById('logo-kiri-img');
    if (kiriImg) kiriImg.src = kiriData;
    if (kiriPrev) kiriPrev.style.display = 'block';
  }

  const kananData = localStorage.getItem('senapati_logo_kanan_data');
  if (kananData) {
    const kananPrev = document.getElementById('set-logo-kanan-preview');
    const kananImg = document.getElementById('logo-kanan-img');
    if (kananImg) kananImg.src = kananData;
    if (kananPrev) kananPrev.style.display = 'block';
  }
  updateSptPreview();
}

function handleLogoUpload(side, inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Ukuran logo maksimal 2MB.', 'error'); return; }

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    localStorage.setItem('senapati_logo_' + side + '_data', dataUrl);

    const sizeEl = document.getElementById('set-logo-' + side + '-size');
    if (sizeEl) localStorage.setItem('senapati_logo_' + side + '_size', sizeEl.value || '90');

    const prevContainer = document.getElementById('set-logo-' + side + '-preview');
    const prevImg = document.getElementById('logo-' + side + '-img');
    if (prevImg) prevImg.src = dataUrl;
    if (prevContainer) prevContainer.style.display = 'block';

    showToast('Logo ' + side + ' berhasil dimuat!', 'success');
    updateSptPreview();
  };
  reader.readAsDataURL(file);
}

function clearLogo(side) {
  localStorage.removeItem('senapati_logo_' + side + '_data');
  localStorage.removeItem('senapati_logo_' + side + '_size');
  const fileInput = document.getElementById('set-logo-' + side + '-file');
  if (fileInput) fileInput.value = '';
  const prevContainer = document.getElementById('set-logo-' + side + '-preview');
  const prevImg = document.getElementById('logo-' + side + '-img');
  if (prevImg) prevImg.src = '';
  if (prevContainer) prevContainer.style.display = 'none';
  showToast('Logo ' + side + ' berhasil dihapus.', 'info');
  updateSptPreview();
}

function saveKopSettings() {
  localStorage.setItem('senapati_kop1', v('set-kop1'));
  localStorage.setItem('senapati_kop2', v('set-kop2'));
  localStorage.setItem('senapati_kop3', v('set-kop3'));
  localStorage.setItem('senapati_kop_telp', v('set-kop-telp'));
  localStorage.setItem('senapati_ttd_kota', v('set-ttd-kota'));
  localStorage.setItem('senapati_ttd_jabatan', v('set-ttd-jabatan'));
  localStorage.setItem('senapati_ttd_nama', v('set-ttd-nama'));
  localStorage.setItem('senapati_ttd_nip', v('set-ttd-nip'));
  localStorage.setItem('senapati_logo_pos', v('set-logo-pos'));
  localStorage.setItem('senapati_logo_size', v('set-logo-size'));
  localStorage.setItem('senapati_font_size', v('set-font-size'));
  localStorage.setItem('senapati_penutup', v('set-penutup'));
  showToast('Pengaturan format Kop Surat & TTD berhasil disimpan.', 'success');
  updateSptPreview();
}

function resetKopSettings() {
  if (!confirm('Reset semua pengaturan ke default?')) return;
  ['senapati_kop1', 'senapati_kop2', 'senapati_kop3', 'senapati_kop_telp', 'senapati_ttd_kota', 'senapati_ttd_jabatan', 'senapati_ttd_nama', 'senapati_ttd_nip', 'senapati_logo_pos', 'senapati_logo_size', 'senapati_font_size', 'senapati_penutup'].forEach(function (k) { localStorage.removeItem(k); });
  loadKopSettings();
  updateSptPreview();
  showToast('Pengaturan dikembalikan ke default.', 'info');
}

function updateSptPreview() {
  const k1 = v('set-kop1') || 'PEMERINTAH KABUPATEN MADIUN';
  const k2 = v('set-kop2') || 'INSPEKTORAT';
  const k3 = v('set-kop3') || 'Pusat Pemerintahan Mejayan, Jl. Alun-Alun Utara No. 4, Caruban';
  const kTelp = v('set-kop-telp') || '';
  const tKota = v('set-ttd-kota') || 'Madiun';
  const tJab = v('set-ttd-jabatan') || 'Inspektur Kabupaten Madiun,';
  const tNama = v('set-ttd-nama') || '________________________';
  const tNip = v('set-ttd-nip') || '........................................';
  const logoPos = (document.getElementById('set-logo-pos') ? document.getElementById('set-logo-pos').value : 'left');
  const logoSize = v('set-logo-size') || '90';
  const fontSize = v('set-font-size') || '12';
  const penutup = v('set-penutup') || 'Demikian Surat Perintah Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.';

  let kopHtml;
  const logoKiri = localStorage.getItem('senapati_logo_kiri_data');
  const logoKanan = localStorage.getItem('senapati_logo_kanan_data');
  const logoKiriSize = v('set-logo-kiri-size') || localStorage.getItem('senapati_logo_kiri_size') || logoSize;
  const logoKananSize = v('set-logo-kanan-size') || localStorage.getItem('senapati_logo_kanan_size') || logoSize;
  const defaultLogo = BASE_URL + '/assets/icon-512.png';

  const leftImgSrc = logoKiri || (logoPos === 'left' ? defaultLogo : '');
  const rightImgSrc = logoKanan || (logoPos === 'right' ? defaultLogo : '');

  const leftImgHtml = leftImgSrc ? '<img src="' + leftImgSrc + '" style="width:' + (logoKiri ? logoKiriSize : logoSize) + 'px;margin-right:16px;" />' : '';
  const rightImgHtml = rightImgSrc ? '<img src="' + rightImgSrc + '" style="width:' + (logoKanan ? logoKananSize : logoSize) + 'px;margin-left:16px;" />' : '';

  kopHtml = leftImgHtml + '<div class="kop-text"><h2>' + k1 + '</h2><h1>' + k2 + '</h1><p>' + k3 + (kTelp ? '<br>Telp: ' + kTelp : '') + '</p></div>' + rightImgHtml;

  const html = '<html><head><style>' +
    'body{font-family:"Times New Roman",Times,serif;padding:30px;line-height:1.5;color:#000;font-size:' + fontSize + 'pt;}' +
    '.kop{display:flex;align-items:center;justify-content:center;border-bottom:4px solid #000;padding-bottom:10px;margin-bottom:2px;}' +
    '.kop-border{border-top:1px solid #000;margin-bottom:28px;}' +
    '.kop-text{text-align:center;line-height:1.2;}' +
    '.kop-text h2{margin:0;font-size:14pt;font-weight:normal;}' +
    '.kop-text h1{margin:4px 0;font-size:18pt;font-weight:bold;}' +
    '.kop-text p{margin:0;font-size:10pt;}' +
    '.title{text-align:center;margin-bottom:24px;}' +
    '.title h3{text-decoration:underline;font-size:13pt;margin:0;}' +
    '.title p{margin:4px 0 0;font-size:12pt;}' +
    '.content{margin:0 20px;}' +
    '.row{display:flex;margin-bottom:7px;}' +
    '.label{width:150px;}.colon{width:20px;}.val{flex:1;}' +
    '.sig{margin-top:50px;display:flex;justify-content:flex-end;}' +
    '.sig-box{width:300px;}' +
    '</style></head><body>' +
    '<div class="kop">' + kopHtml + '</div>' +
    '<div class="kop-border"></div>' +
    '<div class="title"><h3>SURAT PERINTAH TUGAS</h3><p>Nomor: 094/001/SPT/2026</p></div>' +
    '<div class="content">' +
    '<p style="margin-bottom:14px">Yang bertanda tangan di bawah ini, menginstruksikan kepada:</p>' +
    '<div class="row"><div class="label">Nama</div><div class="colon">:</div><div class="val"><strong>NAMA PETUGAS</strong></div></div>' +
    '<div class="row"><div class="label">NIP</div><div class="colon">:</div><div class="val">19800101 200501 1 001</div></div>' +
    '<div class="row"><div class="label">Jabatan</div><div class="colon">:</div><div class="val">Auditor Ahli Madya</div></div>' +
    '<p style="margin-top:18px;margin-bottom:10px">Untuk melaksanakan tugas:</p>' +
    '<div class="row"><div class="label">Tujuan</div><div class="colon">:</div><div class="val">Kantor Camat Madiun</div></div>' +
    '<div class="row"><div class="label">Keperluan</div><div class="colon">:</div><div class="val">Melakukan evaluasi berkas laporan keuangan</div></div>' +
    '<div class="row"><div class="label">Waktu Tugas</div><div class="colon">:</div><div class="val">1 Januari 2026 s/d 3 Januari 2026</div></div>' +
    '<p style="margin-top:20px">' + penutup + '</p>' +
    '</div>' +
    '<div class="sig"><div class="sig-box">' +
    '<p>' + tKota + ', ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + '<br><strong>' + tJab + '</strong></p>' +
    '<br><br><br><br>' +
    '<p style="text-decoration:underline;font-weight:bold;margin:0">' + tNama + '</p>' +
    '<p style="margin:0">NIP. ' + tNip + '</p>' +
    '</div></div>' +
    '</body></html>';

  const frame = document.getElementById('spt-preview-frame');
  if (frame) {
    frame.srcdoc = html;
  }
}

async function setupDatabase() {
  return doSetupDb();
}

// Hard Refresh — multi-layer aggressive cache busting untuk semua browser & perangkat
async function doHardRefresh() {
  if (!confirm('Aplikasi akan dimuat ulang paksa dari server (hard refresh). Lanjutkan?')) return;

  // Tampilkan feedback visual
  var btn = document.querySelector('[onclick="doHardRefresh()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Membersihkan cache...';
  }

  var cleanUrl = window.location.href.split('?')[0].split('#')[0];
  var bustUrl = cleanUrl + '?_hrf=' + Date.now() + '&r=' + Math.random().toString(36).slice(2);

  // ── LAYER 1: Skip Service Worker untuk semua request ──
  // Kirim pesan ke SW agar ia skip semua cache
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    } catch (e) { /* abaikan */ }
  }

  // ── LAYER 2: Unregister semua Service Worker ──
  if ('serviceWorker' in navigator) {
    try {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(reg) { return reg.unregister(); }));
    } catch (e) { /* abaikan */ }
  }

  // ── LAYER 3: Hapus semua Cache Storage ──
  if ('caches' in window) {
    try {
      var cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(function(name) { return caches.delete(name); }));
    } catch (e) { /* abaikan */ }
  }

  // ── LAYER 4: Hapus semua localStorage & sessionStorage cache keys ──
  try {
    // Hanya hapus cache keys, bukan session/auth
    var toDelete = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && (k.startsWith('cache_') || k.startsWith('sw_') || k.startsWith('pwa_'))) {
        toDelete.push(k);
      }
    }
    toDelete.forEach(function(k) { localStorage.removeItem(k); });
  } catch (e) { /* abaikan */ }

  // ── LAYER 5: Reload paksa dengan cache-control headers ──
  // Strategi waterfall: coba yang paling agresif dulu, fallback ke yang lebih sederhana
  function _forceReload() {
    // Strategi A: fetch no-store lalu replace (bypass CDN + browser cache)
    fetch(bustUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    .then(function() {
      window.location.replace(bustUrl);
    })
    .catch(function() {
      // Strategi B: XMLHttpRequest no-cache
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', bustUrl, true);
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.onloadend = function() { window.location.replace(bustUrl); };
        xhr.onerror = function() { window.location.replace(bustUrl); };
        xhr.send();
      } catch (e2) {
        // Strategi C: langsung replace
        window.location.replace(bustUrl);
      }
    });
  }

  // Tunggu sedikit agar semua promise async di atas selesai, lalu reload
  setTimeout(_forceReload, 400);
}


async function submitAddUser() {
  const data = {
    nama: v('new-nama'),
    username: v('new-username'),
    password: document.getElementById('new-password').value,
    role: v('new-role'),
    noWa: v('new-nowa').replace(/\D/g, '')
  };

  if (!data.nama || !data.username || !data.password) { showToast('Semua field wajib diisi.', 'error'); return; }

  showSpinner('Menambahkan pengguna...');
  try {
    const res = await callAPI('addUser', { data: data });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['new-nama', 'new-username', 'new-password', 'new-nowa']);
      loadUsers(); // refresh modal jika terbuka
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function submitChangePassword() {
  const u = v('chg-username');
  const ow = document.getElementById('chg-old').value;
  const nw = document.getElementById('chg-new').value;
  const cf = document.getElementById('chg-confirm').value;

  if (!ow || !nw || !cf) { showToast('Semua field wajib diisi.', 'error'); return; }
  if (nw !== cf) { showToast('Password baru tidak cocok.', 'error'); return; }
  if (nw.length < 6) { showToast('Password baru minimal 6 karakter.', 'error'); return; }

  showSpinner('Mengubah password...');
  try {
    const res = await callAPI('changePassword', { username: u, oldPassword: ow, newPassword: nw });
    hideSpinner();
    if (res.success) { showToast(res.message, 'success'); resetFields(['chg-old', 'chg-new', 'chg-confirm']); }
    else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

// ── Users modal state ──
let _usersAllData = [];
let _usersActiveTab = 'all';
let _usersSearchQuery = '';

function openUsersModal() {
  const modal = document.getElementById('users-modal');
  if (modal) modal.style.display = 'flex';
  lockScroll();
  _usersSearchQuery = '';
  const searchEl = document.getElementById('users-search');
  if (searchEl) searchEl.value = '';
  setUsersTab('all');
  loadUsers();
}

function closeUsersModal() {
  const modal = document.getElementById('users-modal');
  if (modal) modal.style.display = 'none';
  unlockScroll();
}

function setUsersTab(role) {
  _usersActiveTab = role;
  // Update tab styles — hanya 3 tab: all, ADMIN, USER
  ['all', 'admin', 'user'].forEach(function(t) {
    const btn = document.getElementById('utab-' + t);
    if (!btn) return;
    const isActive = (t === 'all' && role === 'all') ||
                     (t === 'admin' && role === 'ADMIN') ||
                     (t === 'user' && role === 'USER');
    btn.style.color = isActive ? 'var(--primary)' : 'var(--text-muted)';
    btn.style.background = isActive ? 'var(--card-bg)' : 'transparent';
    btn.style.borderBottom = isActive ? '2px solid var(--primary)' : '2px solid transparent';
    btn.style.fontWeight = isActive ? '700' : '600';
  });
  _renderUsersTable();
}

function filterUsersModal(query) {
  _usersSearchQuery = (query || '').toLowerCase().trim();
  _renderUsersTable();
}

function _renderUsersTable() {
  const tbody = document.getElementById('tbody-users');
  const countBar = document.getElementById('users-count-bar');
  if (!tbody) return;

  let data = _usersAllData;

  // Filter by tab — tab USER mencakup USER dan PROTOKOL
  if (_usersActiveTab === 'ADMIN') {
    data = data.filter(function(d) { return d.role === 'ADMIN'; });
  } else if (_usersActiveTab === 'USER') {
    data = data.filter(function(d) { return d.role === 'USER' || d.role === 'PROTOKOL'; });
  }

  // Filter by search
  if (_usersSearchQuery) {
    data = data.filter(function(d) {
      const wa = d.noWa ? String(d.noWa).replace(/^'/, '') : '';
      return (d.nama || '').toLowerCase().includes(_usersSearchQuery) ||
             (d.username || '').toLowerCase().includes(_usersSearchQuery) ||
             wa.includes(_usersSearchQuery);
    });
  }

  // Update count bar
  if (countBar) {
    const total = _usersAllData.length;
    const shown = data.length;
    const roleLabel = _usersActiveTab === 'all' ? 'semua role' :
                      _usersActiveTab === 'ADMIN' ? 'Admin' : 'User';
    countBar.textContent = shown + ' pengguna ditampilkan' +
      (_usersSearchQuery ? ' (hasil pencarian)' : ' — ' + roleLabel) +
      ' dari ' + total + ' total';
  }

  if (!data.length) {
    tbody.innerHTML = '<tr class="no-data"><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted)">' +
      '<i class="bi bi-search" style="font-size:1.8rem;display:block;margin-bottom:8px;opacity:.4"></i>' +
      (_usersSearchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Tidak ada pengguna dengan role ini.') +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function (d, i) {
    const isCurrent = APP.user && d.username === APP.user.username;
    const displayWa = d.noWa ? d.noWa.replace(/^'/, '') : '';
    const roleBadgeColor = d.role === 'ADMIN' ? 'masuk' : d.role === 'PROTOKOL' ? 'spt' : 'arsip';
    const waCell = displayWa
      ? '<span style="font-family:var(--mono);font-size:.75rem;color:var(--success)"><i class="bi bi-whatsapp"></i> ' + esc(displayWa) + '</span>'
      : '<button class="btn-secondary-custom" style="padding:3px 8px;font-size:.72rem" onclick="openSetWAModal(\'' + d.id + '\',\'' + esc(d.nama) + '\',\'\')"><i class="bi bi-pencil"></i> Set</button>';
    const editWaBtn = displayWa ? '<button class="btn-secondary-custom" style="padding:3px 8px;font-size:.72rem;margin-left:4px" onclick="openSetWAModal(\'' + d.id + '\',\'' + esc(d.nama) + '\',\'' + esc(displayWa) + '\')"><i class="bi bi-pencil"></i></button>' : '';

    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:10px"><div class="user-table-avatar">' + d.nama.charAt(0).toUpperCase() + '</div>' + esc(d.nama) + (isCurrent ? ' <span style="font-size:.65rem;color:var(--primary);background:var(--primary-xlt);padding:1px 6px;border-radius:10px">Anda</span>' : '') + '</div></td>' +
      '<td><span style="font-family:var(--mono);font-size:.82rem">' + esc(d.username) + '</span></td>' +
      '<td><span class="badge-cat ' + roleBadgeColor + '">' + esc(d.role) + '</span></td>' +
      '<td>' + waCell + editWaBtn + '</td>' +
      '<td>' + fmtDate(d.created || d.CreatedAt) + '</td>' +
      '<td class="action-col">' + (isCurrent ? '<span style="font-size:.78rem;color:var(--text-muted)">—</span>' : '<button class="btn-danger-custom" onclick="deleteItem(\'deleteUser\',\'' + d.id + '\',loadUsers)"><i class="bi bi-person-x"></i> Hapus</button>') + '</td>' +
      '</tr>';
  }).join('');
}

async function loadUsers() {
  const countBar = document.getElementById('users-count-bar');
  if (countBar) countBar.textContent = 'Memuat data...';
  try {
    const res = await callAPI('getUsers', {});
    if (!res.success || !res.data.length) {
      _usersAllData = [];
      const tbody = document.getElementById('tbody-users');
      if (tbody) tbody.innerHTML = '<tr class="no-data"><td colspan="7">Tidak ada pengguna.</td></tr>';
      if (countBar) countBar.textContent = '0 pengguna';
      return;
    }
    _usersAllData = res.data;
    _renderUsersTable();
  } catch (err) { console.warn('Users load error:', err); }
}

// ══════════════════════════════════════════════════════════
//  MODUL: DATA AJUDAN
// ══════════════════════════════════════════════════════════
let _ajudanCache = []; // cache untuk dropdown di modal WA

async function loadAjudan() {
  try {
    const res = await callAPI('getAjudan', {});
    const tbody = document.getElementById('tbody-ajudan');
    if (!res.success || !res.data.length) {
      _ajudanCache = [];
      if (tbody) tbody.innerHTML = '<tr class="no-data"><td colspan="4"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data ajudan</td></tr>';
      return;
    }
    _ajudanCache = res.data;
    if (!tbody) return;
    tbody.innerHTML = res.data.map(function (d, i) {
      const noWa = String(d['No WA'] || '').replace(/^'/, '');
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + esc(d['Nama'] || '-') + '</strong></td>' +
        '<td>' + (noWa ? '<a href="https://wa.me/' + noWa.replace(/\D/g, '').replace(/^0/, '62') + '" target="_blank" style="color:#25D366"><i class="bi bi-whatsapp"></i> ' + esc(noWa) + '</a>' : '-') + '</td>' +
        '<td class="action-col" style="display:flex;gap:5px">' +
        '<button class="btn-warning-custom" onclick="openEditAjudan(\'' + esc(d['ID']) + '\',\'' + esc(d['Nama']) + '\',\'' + esc(noWa) + '\')"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn-danger-custom" onclick="deleteItem(\'deleteAjudan\',\'' + esc(d['ID']) + '\',loadAjudan)"><i class="bi bi-trash"></i></button>' +
        '</td></tr>';
    }).join('');
  } catch (err) { console.warn('Load ajudan error:', err); }
}

async function submitAddAjudan() {
  const nama = v('aj-nama');
  const noWa = v('aj-nowa');
  if (!nama) { showToast('Nama ajudan wajib diisi.', 'error'); return; }
  if (!noWa) { showToast('No WA ajudan wajib diisi.', 'error'); return; }
  showSpinner('Menyimpan data ajudan...');
  try {
    const res = await callAPI('saveAjudan', { data: { nama, noWa } });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['aj-nama', 'aj-nowa']);
      loadAjudan();
    } else showToast(res.message, 'error');
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

let _editAjudanId = null;
function openEditAjudan(id, nama, noWa) {
  _editAjudanId = id;
  const newNama = prompt('Nama Ajudan:', nama);
  if (newNama === null) return;
  const newNoWa = prompt('No WA:', noWa);
  if (newNoWa === null) return;

  showSpinner('Memperbarui data ajudan...');
  callAPI('updateAjudan', { id: id, data: { nama: newNama.trim(), noWa: newNoWa.trim() } })
    .then(function (res) {
      hideSpinner();
      if (res.success) { showToast(res.message, 'success'); loadAjudan(); }
      else showToast(res.message, 'error');
    })
    .catch(function (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); });
}

// ══════════════════════════════════════════════════════════
//  MODUL: PEJABAT DISPOSISI
// ══════════════════════════════════════════════════════════
let _pejabatCache = []; // cache untuk datalist & WA modal
let _pejabatSearchQuery = ''; // state pencarian di modal

function openPejabatModal() {
  const modal = document.getElementById('pejabat-modal');
  if (modal) modal.style.display = 'flex';
  lockScroll();
  _pejabatSearchQuery = '';
  const searchEl = document.getElementById('pejabat-search');
  if (searchEl) searchEl.value = '';
  loadPejabatDisposisi();
}

function closePejabatModal() {
  const modal = document.getElementById('pejabat-modal');
  if (modal) modal.style.display = 'none';
  unlockScroll();
}

function filterPejabatModal(query) {
  _pejabatSearchQuery = (query || '').toLowerCase().trim();
  _renderPejabatTable();
}

function _renderPejabatTable() {
  const tbody = document.getElementById('tbody-pejabat');
  const countBar = document.getElementById('pejabat-count-bar');
  if (!tbody) return;

  let data = _pejabatCache;

  if (_pejabatSearchQuery) {
    data = data.filter(function(d) {
      const wa = String(d['No WA'] || '').replace(/^'/, '');
      return (d['Jabatan'] || '').toLowerCase().includes(_pejabatSearchQuery) ||
             (d['Nama']    || '').toLowerCase().includes(_pejabatSearchQuery) ||
             wa.includes(_pejabatSearchQuery);
    });
  }

  if (countBar) {
    countBar.textContent = data.length + ' pejabat ditampilkan' +
      (_pejabatSearchQuery ? ' (hasil pencarian "' + _pejabatSearchQuery + '")' : '') +
      ' dari ' + _pejabatCache.length + ' total';
  }

  if (!data.length) {
    tbody.innerHTML = '<tr class="no-data"><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">' +
      '<i class="bi bi-search" style="font-size:2rem;display:block;margin-bottom:8px;opacity:.4"></i>' +
      (_pejabatSearchQuery ? 'Tidak ada pejabat yang cocok dengan "<strong>' + esc(_pejabatSearchQuery) + '</strong>"' : 'Belum ada data pejabat') +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(function(d, i) {
    const noWa = String(d['No WA'] || '').replace(/^'/, '');
    const waLink = noWa
      ? '<a href="https://wa.me/' + noWa.replace(/\D/g,'').replace(/^0/,'62') + '" target="_blank" style="color:#25D366;display:inline-flex;align-items:center;gap:4px"><i class="bi bi-whatsapp"></i> ' + esc(noWa) + '</a>'
      : '<span style="color:var(--text-muted);font-size:.78rem">—</span>';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + esc(d['Jabatan'] || '-') + '</strong></td>' +
      '<td>' + esc(d['Nama'] || '—') + '</td>' +
      '<td>' + waLink + '</td>' +
      '<td class="action-col" style="display:flex;gap:5px">' +
      '<button class="btn-warning-custom" onclick="openEditPejabat(\'' + esc(d['ID']) + '\',\'' + esc(d['Jabatan']||'') + '\',\'' + esc(d['Nama']||'') + '\',\'' + esc(noWa) + '\')"><i class="bi bi-pencil"></i></button>' +
      '<button class="btn-danger-custom" onclick="deleteItem(\'deletePejabatDisposisi\',\'' + esc(d['ID']) + '\',loadPejabatDisposisi)"><i class="bi bi-trash"></i></button>' +
      '</td></tr>';
  }).join('');
}

async function loadPejabatDisposisi() {
  const countBar = document.getElementById('pejabat-count-bar');
  if (countBar) countBar.textContent = 'Memuat data...';
  try {
    const res = await callAPI('getPejabatDisposisi', {});
    _pejabatCache = (res.success ? res.data : []);
    _populatePejabatDatalist();
    _renderPejabatTable();
  } catch (err) {
    _pejabatCache = [];
    _renderPejabatTable();
    console.warn('Load pejabat error:', err);
  }
}

function _populatePejabatDatalist() {
  const dl = document.getElementById('list-pejabat-dynamic');
  if (!dl) return;
  dl.innerHTML = _pejabatCache.map(function (p) {
    // Tampilkan jabatan; jika ada nama, tampilkan keduanya
    const val = p['Jabatan'] || '';
    const label = p['Nama'] ? val + ' (' + p['Nama'] + ')' : val;
    return '<option value="' + esc(val) + '">' + esc(label) + '</option>';
  }).join('');
}

async function submitAddPejabat() {
  const jabatan = v('pj-jabatan');
  const nama    = v('pj-nama');
  const noWa    = v('pj-nowa');
  if (!jabatan) { showToast('Jabatan wajib diisi.', 'error'); return; }
  showSpinner('Menyimpan data pejabat...');
  try {
    const res = await callAPI('savePejabatDisposisi', { data: { jabatan, nama, noWa } });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['pj-jabatan', 'pj-nama', 'pj-nowa']);
      _pejabatCache = []; // invalidate cache
      loadPejabatDisposisi();
      openPejabatModal(); // buka/refresh modal daftar
    } else showToast(res.message, 'error');
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

function openEditPejabat(id, jabatan, nama, noWa) {
  // Buat inline modal edit
  const old = document.getElementById('edit-pejabat-modal');
  if (old) old.remove();

  const dlg = document.createElement('div');
  dlg.id = 'edit-pejabat-modal';
  dlg.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
  dlg.innerHTML =
    '<div style="background:var(--card-bg,#fff);border-radius:16px;padding:28px 24px;width:min(420px,96vw);box-shadow:0 24px 80px rgba(0,0,0,.4);border:1px solid var(--border)">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">' +
    '<i class="bi bi-pencil-fill" style="font-size:1.1rem;color:var(--accent)"></i>' +
    '<div style="font-weight:800;font-size:1rem;color:var(--text-main)">Edit Pejabat</div>' +
    '</div>' +
    '<div class="form-group" style="margin-bottom:14px">' +
    '<label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:5px">Jabatan <span class="req">*</span></label>' +
    '<input type="text" id="ep-jabatan" class="form-control-custom" value="' + esc(jabatan) + '" style="width:100%" />' +
    '</div>' +
    '<div class="form-group" style="margin-bottom:14px">' +
    '<label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:5px">Nama Pejabat</label>' +
    '<input type="text" id="ep-nama" class="form-control-custom" value="' + esc(nama) + '" style="width:100%" />' +
    '</div>' +
    '<div class="form-group" style="margin-bottom:20px">' +
    '<label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:5px"><i class="bi bi-whatsapp" style="color:#25D366"></i> No. WhatsApp</label>' +
    '<input type="tel" id="ep-nowa" class="form-control-custom" value="' + esc(noWa) + '" style="width:100%" />' +
    '</div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
    '<button onclick="document.getElementById(\'edit-pejabat-modal\').remove()" style="padding:9px 18px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-muted);font-size:.88rem;font-weight:600;cursor:pointer;font-family:inherit">Batal</button>' +
    '<button onclick="_submitEditPejabat(\'' + esc(id) + '\')" style="padding:9px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--primary-lt));color:#fff;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit"><i class="bi bi-save"></i> Simpan</button>' +
    '</div>' +
    '</div>';
  dlg.addEventListener('click', function(e) { if (e.target === dlg) dlg.remove(); });
  document.body.appendChild(dlg);
}

async function _submitEditPejabat(id) {
  const jabatan = document.getElementById('ep-jabatan') ? document.getElementById('ep-jabatan').value.trim() : '';
  const nama    = document.getElementById('ep-nama')    ? document.getElementById('ep-nama').value.trim()    : '';
  const noWa    = document.getElementById('ep-nowa')    ? document.getElementById('ep-nowa').value.trim()    : '';
  if (!jabatan) { showToast('Jabatan wajib diisi.', 'error'); return; }
  const dlg = document.getElementById('edit-pejabat-modal');
  if (dlg) dlg.remove();
  showSpinner('Memperbarui data pejabat...');
  try {
    const res = await callAPI('updatePejabatDisposisi', { id: id, data: { jabatan, nama, noWa } });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      _pejabatCache = []; // invalidate cache
      loadPejabatDisposisi();
    } else showToast(res.message, 'error');
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

async function doSetupDb() {
  if (!confirm('Tindakan ini akan menginisialisasi ulang struktur Sheet pada spreadsheet. Lanjutkan?')) return;
  showSpinner('Inisialisasi Database...', ['Memeriksa sheet yang ada', 'Membuat sheet baru', 'Migrasi header', 'Memformat header']);
  try {
    setSpinnerStep(0, 4);
    const res = await callAPI('setupDb', {});
    finishSpinner(4);
    await new Promise(r => setTimeout(r, 200));
    hideSpinner();
    if (res.success) {
      // Tampilkan detail hasil dalam modal kecil
      _showSetupDbResult(res.message);
    } else {
      showToast(res.message || 'Gagal inisialisasi database.', 'error');
    }
  } catch (err) {
    hideSpinner(); showToast('Network Error: ' + err.message, 'error');
  }
}

function _showSetupDbResult(message) {
  const old = document.getElementById('setupdb-result-modal');
  if (old) old.remove();

  // Parse pesan: "✅ Dibuat: X, Y | 🔄 Dimigrasi: Z | ✔️ Sesuai: A, B"
  const lines = (message || 'Database sudah siap.').split(' | ').map(function(s) { return s.trim(); }).filter(Boolean);

  const linesHtml = lines.map(function(line) {
    const isCreated  = line.startsWith('✅');
    const isMigrated = line.startsWith('🔄');
    const isOk       = line.startsWith('✔️') || line.startsWith('✔');
    const color = isCreated ? '#16a34a' : isMigrated ? '#d97706' : '#64748b';
    const bg    = isCreated ? 'rgba(22,163,74,.08)' : isMigrated ? 'rgba(217,119,6,.08)' : 'rgba(100,116,139,.06)';
    return '<div style="padding:8px 12px;border-radius:8px;background:' + bg + ';border:1px solid ' + color + '33;font-size:.82rem;color:' + color + ';font-weight:600;line-height:1.5">' + line + '</div>';
  }).join('');

  const dlg = document.createElement('div');
  dlg.id = 'setupdb-result-modal';
  dlg.style.cssText = 'position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
  dlg.innerHTML =
    '<div style="background:var(--card-bg,#fff);border-radius:16px;padding:24px;width:min(480px,96vw);box-shadow:0 24px 80px rgba(0,0,0,.4);border:1px solid var(--border)">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
    '<div style="width:40px;height:40px;border-radius:12px;background:rgba(22,163,74,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="bi bi-database-check-fill" style="color:#16a34a;font-size:1.1rem"></i></div>' +
    '<div><div style="font-weight:800;font-size:1rem;color:var(--text-main)">Inisialisasi Selesai</div>' +
    '<div style="font-size:.75rem;color:var(--text-muted)">Hasil pemeriksaan setiap sheet</div></div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">' + linesHtml + '</div>' +
    '<div style="display:flex;gap:8px;font-size:.72rem;color:var(--text-muted);margin-bottom:16px;flex-wrap:wrap">' +
    '<span style="display:flex;align-items:center;gap:4px"><span style="color:#16a34a;font-weight:700">✅ Dibuat</span> — sheet baru</span>' +
    '<span style="display:flex;align-items:center;gap:4px"><span style="color:#d97706;font-weight:700">🔄 Dimigrasi</span> — header diperbarui</span>' +
    '<span style="display:flex;align-items:center;gap:4px"><span style="color:#64748b;font-weight:700">✔️ Sesuai</span> — tidak ada perubahan</span>' +
    '</div>' +
    '<button onclick="document.getElementById(\'setupdb-result-modal\').remove()" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--primary-lt));color:#fff;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit">Tutup</button>' +
    '</div>';

  dlg.addEventListener('click', function(e) { if (e.target === dlg) dlg.remove(); });
  document.body.appendChild(dlg);
}

