// ══════════════════════════════════════════════════════════
//  NAVIGATION & ROUTING
// ══════════════════════════════════════════════════════════
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  agenda: 'Agenda Kegiatan',
  'surat-masuk': 'Surat Masuk',
  disposisi: 'Sistem Disposisi',
  arsip: 'Arsip Digital',
  peta: 'Peta Agenda Kegiatan',
  panduan: 'Panduan Teknis SENAPATI',
  pengaturan: 'Pengaturan Sistem',
  'template-surat': 'Template Surat',
  'buat-surat': 'Buat Surat',
  generator: 'Generator Surat'
};

const PAGE_SUBS = {
  dashboard: 'Ringkasan data agenda dan tata informasi',
  agenda: 'Jadwal kegiatan Bupati Ponorogo per tanggal',
  'surat-masuk': 'Manajemen Arsip Surat Masuk',
  disposisi: 'Aliran disposisi pimpinan',
  arsip: 'Manajemen surat masuk dan dokumen arsip digital',
  peta: 'Visualisasi lokasi agenda secara interaktif',
  panduan: 'Dokumentasi lengkap fitur SENAPATI',
  pengaturan: 'Konfigurasi akun & sistem',
  'template-surat': 'Kelola koleksi template dokumen .docx',
  'buat-surat': 'Generate surat dari template secara otomatis',
  generator: 'Buat dan kelola template surat resmi Bupati Ponorogo'
};

/**
 * Mengatur visibilitas menu berdasarkan Role User (RBAC)
 */
function applyRoleVisibility(role) {
  document.querySelectorAll('.nav-link-item').forEach(function (el) { el.style.display = ''; });

  if (role === 'PROTOKOL') {
    document.querySelector('[data-page="pengaturan"]').style.display = 'none';
  } else if (role === 'USER') {
    document.querySelector('[data-page="pengaturan"]').style.display = 'none';

    // Sembunyikan tombol aksi untuk user biasa (hanya lihat)
    document.querySelectorAll('.btn-primary-custom, .btn-warning-custom, .btn-danger-custom').forEach(function (btn) {
      const btnStr = btn.onclick?.toString() || '';
      const isSafeBtn = btn.closest('.page-header') || btnStr.includes('load') || btnStr.includes('Preview') || btnStr.includes('print');

      if (!isSafeBtn) {
        btn.style.display = 'none'; // Terapkan pembatasan visibilitas
      }
    });
  }
}

/**
 * Fungsi utama untuk berpindah halaman (Single Page Application logic)
 */
function navigateTo(page) {
  const role = APP.user ? APP.user.role : 'USER';
  const adminOnly = ['pengaturan'];

  if (adminOnly.includes(page) && role !== 'ADMIN') {
    showToast('Anda tidak memiliki akses ke halaman ini.', 'error');
    return;
  }

  // Reset view aktif
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });

  // Fallback untuk legacy ID
  let targetPageId = page;
  if (page === 'surat') targetPageId = 'dashboard';
  if (page === 'surat-masuk') { targetPageId = 'arsip'; setArsipTab('arsip-masuk'); }
  if (page === 'arsip-dokumen') { targetPageId = 'arsip'; setArsipTab('arsip-dokumen'); }
  if (page === 'template-surat') { targetPageId = 'generator'; setGenTab('gen-template'); }
  if (page === 'buat-surat') { targetPageId = 'generator'; setGenTab('gen-buat'); }
  if (page === 'generator') { setGenTab('gen-buat'); }
  if (page === 'arsip') { setArsipTab('arsip-masuk'); }

  const target = document.getElementById('page-' + targetPageId);
  if (target) target.classList.add('active');

  // Handle active class di navigasi
  document.querySelectorAll('.nav-link-item, .sub-nav-item').forEach(function (l) { l.classList.remove('active'); });
  const activeLink = document.querySelector('[data-page="' + page + '"]');
  if (activeLink) {
    activeLink.classList.add('active');
    const subMenu = activeLink.closest('.sub-menu');
    if (subMenu) subMenu.classList.add('open');
  }

  // Update Header
  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;
  document.getElementById('topbar-sub').textContent = PAGE_SUBS[page] || '';
  APP.currentPage = page;
  closeSidebar();

  // Load data sesuai halaman
  if (page === 'dashboard') loadDashboard();
  if (page === 'agenda') loadAgenda();
  if (targetPageId === 'arsip') { loadSuratMasuk(); loadArsip(); }
  if (page === 'disposisi') loadDisposisi();
  if (page === 'peta') {
    document.getElementById('main-content').classList.add('peta-mode');
    loadPeta();
    [150, 400, 800, 1500].forEach(function(t) {
      setTimeout(function () { if (typeof _lfMap !== 'undefined' && _lfMap) _lfMap.invalidateSize({ animate: false }); }, t);
    });
  } else {
    document.getElementById('main-content').classList.remove('peta-mode');
  }
  if (targetPageId === 'generator') { loadTemplates(); loadTemplatesForGenerator(); }
  if (page === 'pengaturan') {
    loadKopSettings();
    loadAjudan(); // preload cache ajudan
    const chgEl = document.getElementById('chg-username');
    if (chgEl) chgEl.value = APP.user ? APP.user.username : '';
  }
}

function toggleSubMenu(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function setSkTab(activeTabId) {
  document.querySelectorAll('#tab-sk-arsip, #tab-sk-tugas, #tab-sk-perintah').forEach(function (t) {
    t.classList.remove('active');
  });
  const active = document.getElementById(activeTabId);
  if (active) active.classList.add('active');
}

function navigateSkSub(page) {
  navigateTo(page);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

function toggleCollapse(contentId, trigger) {
  const el = document.getElementById(contentId);
  if (!el) return;
  el.classList.toggle('collapsed');
  if (trigger) trigger.classList.toggle('collapsed');
}

function togglePanduanAccordion(header) {
  const body = header.nextElementSibling;
  const isOpen = body.classList.contains('open');

  document.querySelectorAll('.panduan-accordion-body').forEach(function (b) { b.classList.remove('open'); });
  document.querySelectorAll('.panduan-accordion-header').forEach(function (h) { h.classList.remove('open'); });

  if (!isOpen) {
    body.classList.add('open');
    header.classList.add('open');
  }
}

function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<i class="bi bi-eye"></i>';
  }
}

// ══════════════════════════════════════════════════════════
//  AUTHENTICATION (LOGIN / LOGOUT)
// ══════════════════════════════════════════════════════════
async function doLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;

  if (!u || !p) { showToast('Username dan password wajib diisi.', 'error'); return; }

  showSpinner('Memverifikasi...');
  try {
    const res = await callAPI('login', { username: u, password: p });
    hideSpinner();
    if (res.success) {
      APP.user = res.user;

      // Role USER → alihkan ke halaman protokol khusus
      if (res.user.role === 'USER') {
        // Simpan session untuk halaman protokol
        localStorage.setItem('proto_session', JSON.stringify({ user: res.user, ts: Date.now() }));
        window.location.href = '/protokol/';
        return;
      }

      // Simpan session admin/protokol ke localStorage (1 jam)
      localStorage.setItem('app_session', JSON.stringify({ user: res.user, ts: Date.now() }));

      _applyUserToShell(res.user);
      applyRoleVisibility(res.user.role);
      startClock();
      navigateTo('dashboard');
      showToast('Selamat datang, ' + res.user.nama + '!', 'success');
      // Preload pejabat disposisi untuk datalist
      setTimeout(function() { _ensurePejabatCache(); }, 600);
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    hideSpinner();
    showToast('Gagal terhubung ke server: ' + err.message, 'error');
  }
}

function _applyUserToShell(user) {
  document.getElementById('view-login').style.display = 'none';
  document.getElementById('app-shell').style.display = 'block';
  document.getElementById('user-nama').textContent = user.nama;
  document.getElementById('user-role').textContent = user.role;
  document.getElementById('user-avatar').textContent = user.nama.charAt(0).toUpperCase();
  document.getElementById('info-user').textContent = user.nama;
  document.getElementById('chg-username').value = user.username;
}

function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  APP.user = null;
  localStorage.removeItem('app_session');
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('view-login').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  showToast('Berhasil keluar.', 'info');
}
