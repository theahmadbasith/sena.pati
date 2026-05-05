// ══════════════════════════════════════════════════════════════════════════════
//  SENAPATI PROTOKOL — protokol.js
//  Halaman Protokol untuk Role USER (Read-Only Agenda & Peta)
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  1. GLOBAL STATE & CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = window.location.origin;
const APP = { user: null, currentPage: 'agenda', agendaData: [], filteredData: [], searchQuery: '', filterStatus: 'all' };
const PCAL = { year: 0, month: 0, agendaData: [] };

// ─────────────────────────────────────────────────────────────────────────────
//  2. API HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function callAPI(action, payload) {
  try {
    const res = await fetch(BASE_URL + '/api/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload: payload || {} })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function showSpinner(label) {
  const el = document.getElementById('pspinner');
  const lbl = document.getElementById('pspinner-label');
  if (lbl) lbl.textContent = label || 'Memuat...';
  if (el) el.classList.add('on');
}

function hideSpinner() {
  const el = document.getElementById('pspinner');
  if (el) el.classList.remove('on');
}

function showToast(msg, type) {
  const icons = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' };
  const el = document.createElement('div');
  el.className = 'ptoast-item ' + (type === 'success' ? 'ok' : type === 'error' ? 'err' : 'inf');
  el.innerHTML = '<i class="bi bi-' + (icons[type] || icons.info) + '"></i><span>' + esc(msg) + '</span>';
  document.getElementById('ptoast').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function fmtDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function pScrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Scroll ke section agenda dengan offset topbar yang tepat
function pScrollToSection(section) {
  const topbarEl = document.getElementById('ptopbar');
  const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 60;
  const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h') || '60', 10);
  const offset = Math.max(topbarH, safeTop) + 12;

  let targetId = '';
  if (section === 'today')    targetId = 'psec-today';
  if (section === 'tomorrow') targetId = 'psec-tomorrow';
  if (section === 'calendar') targetId = 'psec-calendar';

  const el = document.getElementById(targetId);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const targetY = rect.top + scrollTop - offset;

  window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. THEME & CLOCK
// ─────────────────────────────────────────────────────────────────────────────
function pToggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('senapati_proto_theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('ptheme-icon');
  if (icon) icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

function initTheme() {
  const saved = localStorage.getItem('senapati_proto_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    const icon = document.getElementById('ptheme-icon');
    if (icon) icon.className = 'bi bi-sun-fill';
  }
}

function startClock() {
  function tick() {
    const now = new Date();
    const clockEl = document.getElementById('pclock');
    const dateEl = document.getElementById('pdate');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (dateEl) {
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + '/' + (now.getMonth() + 1);
    }
    // Update calendar card dengan bulan singkat
    const calMonthEl = document.getElementById('psc-cal-month');
    if (calMonthEl) {
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      calMonthEl.textContent = months[now.getMonth()];
    }
  }
  tick();
  setInterval(tick, 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. USER PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function pToggleUserModal() {
  const modal = document.getElementById('puser-modal');
  const backdrop = document.getElementById('puser-backdrop');
  if (!modal) return;
  const isOpen = modal.style.display === 'block';
  modal.style.display = isOpen ? 'none' : 'block';
  backdrop.style.display = isOpen ? 'none' : 'block';
}

function pCloseUserModal() {
  const modal = document.getElementById('puser-modal');
  const backdrop = document.getElementById('puser-backdrop');
  if (modal) modal.style.display = 'none';
  if (backdrop) backdrop.style.display = 'none';
}

function pOpenSystemModal() {
  const modal = document.getElementById('psystem-modal');
  if (modal) modal.style.display = 'flex';
}

function pCloseSystemModal() {
  const modal = document.getElementById('psystem-modal');
  if (modal) modal.style.display = 'none';
}

function pLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  localStorage.removeItem('proto_session');
  window.location.href = '/app';
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function pNavigate(page) {
  APP.currentPage = page;

  // Update tabs
  document.querySelectorAll('.ptb-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById('ptab-' + page);
  if (activeTab) activeTab.classList.add('active');

  // Update views
  document.querySelectorAll('.pview').forEach(v => v.classList.remove('active'));
  const activeView = document.getElementById('pview-' + page);
  if (activeView) activeView.classList.add('active');

  // Handle peta mode
  const main = document.getElementById('pmain');
  if (page === 'peta') {
    if (main) main.classList.add('peta-mode');
    if (typeof loadPeta === 'function') loadPeta();
  } else {
    if (main) main.classList.remove('peta-mode');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  7. SESSION CHECK & INIT
// ─────────────────────────────────────────────────────────────────────────────
function checkSession() {
  const sessionStr = localStorage.getItem('proto_session');
  if (!sessionStr) {
    showNoSession();
    return false;
  }

  try {
    const session = JSON.parse(sessionStr);
    const now = Date.now();
    const age = now - (session.ts || 0);

    // Session expires after 1 hour (3600000 ms)
    if (age > 60 * 60 * 1000) {
      localStorage.removeItem('proto_session');
      showNoSession();
      return false;
    }

    APP.user = session.user;
    return true;
  } catch (e) {
    showNoSession();
    return false;
  }
}

function showNoSession() {
  document.getElementById('pload-screen').style.display = 'none';
  document.getElementById('pno-session').style.display = 'flex';
}

function hideLoadScreen() {
  const screen = document.getElementById('pload-screen');
  if (!screen) return;

  // Trigger fly-to-topbar animation
  screen.classList.add('move-to-topbar');

  // Hide completely after animation finishes
  setTimeout(() => {
    screen.classList.add('hidden');
    screen.style.display = 'none';
  }, 700);
}

function updateLoadProgress(_pct, _status) {
  // kept for compatibility
}

async function initApp() {
  if (!checkSession()) return;

  const user = APP.user;
  document.getElementById('puser-name').textContent = user.nama || 'User';
  document.getElementById('ptb-avatar').textContent = (user.nama || 'U').charAt(0).toUpperCase();
  document.getElementById('puser-card-avatar').textContent = (user.nama || 'U').charAt(0).toUpperCase();
  document.getElementById('puser-card-name').textContent = user.nama || 'User';
  document.getElementById('puser-card-role').textContent = user.role || 'USER';

  // Tampilkan noWa — jika tidak ada di session, fetch dari sheet Users
  const _applyWa = function (wa) {
    const waCard = document.getElementById('puser-card-wa');
    const waNumber = document.getElementById('puser-card-wa-number');
    if (wa) {
      if (waNumber) waNumber.textContent = wa;
      if (waCard) waCard.style.display = 'flex';
    } else {
      if (waCard) waCard.style.display = 'none';
    }
  };

  const rawWa = user.noWa ? String(user.noWa).replace(/^'/, '').trim() : '';
  if (rawWa) {
    _applyWa(rawWa);
  } else {
    // Fallback: baca dari sheet Users
    try {
      const res = await callAPI('getUsers', {});
      if (res.success && res.data) {
        const me = res.data.find(u => u.username === user.username);
        const wa = me && me.noWa ? String(me.noWa).replace(/^'/, '').trim() : '';
        if (wa) APP.user.noWa = wa;
        _applyWa(wa);
      }
    } catch (_) { _applyWa(''); }
  }

  initTheme();
  startClock();
  await loadAgenda();
  setTimeout(hideLoadScreen, 300);
}

// ─────────────────────────────────────────────────────────────────────────────
//  8. AGENDA DATA LOADING
// ─────────────────────────────────────────────────────────────────────────────
async function loadAgenda() {
  try {
    const [agendaRes, dispRes] = await Promise.all([
      callAPI('getAgenda', {}),
      callAPI('getDisposisi', {})
    ]);

    if (agendaRes.success) {
      const agendaData = agendaRes.data || [];
      const dispData = (dispRes.success ? dispRes.data : []) || [];

      // Buat map: agendaId → disposisi (ambil yang pertama/terbaru)
      const dispMap = {};
      dispData.forEach(function (d) {
        const refId = d['Referensi Agenda ID'] || '';
        if (refId && refId !== '-') {
          if (!dispMap[refId]) dispMap[refId] = d;
        }
      });

      // Inject info disposisi ke setiap agenda
      agendaData.forEach(function (ag) {
        if (ag['Status Kehadiran'] === 'Disposisi') {
          const disp = dispMap[ag['ID']] || null;
          ag._disposisiKepada = disp ? (disp['Kepada'] || '') : '';
          ag._disposisiDari = disp ? (disp['Dari'] || 'Bupati') : 'Bupati';
        }
      });

      APP.agendaData = agendaData;
      PCAL.agendaData = agendaData;
      renderAgenda();
      renderCalendar();
    }
  } catch (err) {
    showToast('Gagal memuat agenda: ' + err.message, 'error');
  }
}

function pRefreshAgenda() {
  const icon = document.getElementById('picon-refresh');
  if (icon) {
    icon.style.animation = 'spin 0.5s linear';
    setTimeout(() => icon.style.animation = '', 500);
  }
  loadAgenda();
}

// ─────────────────────────────────────────────────────────────────────────────
//  9. AGENDA RENDERING (TODAY, TOMORROW, SEARCH)
// ─────────────────────────────────────────────────────────────────────────────
function renderAgenda() {
  const now = new Date();
  // Gunakan WIB (UTC+7) agar tanggal hari ini akurat
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const today = wibNow.toISOString().split('T')[0];
  const tomorrow = new Date(wibNow.getTime() + 86400000).toISOString().split('T')[0];

  // Apply filters
  let filtered = APP.agendaData.filter(d => {
    if (APP.filterStatus !== 'all' && d['Status Kehadiran'] !== APP.filterStatus) return false;
    if (APP.searchQuery) {
      const q = APP.searchQuery.toLowerCase();
      const searchable = [
        d['Nama Kegiatan'] || '',
        d['Lokasi'] || ''
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  APP.filteredData = filtered;

  // Categorize
  const todayItems = filtered.filter(d => (d['Tanggal'] || '').startsWith(today));
  const tomorrowItems = filtered.filter(d => (d['Tanggal'] || '').startsWith(tomorrow));

  // Update stats
  document.getElementById('psc-today').textContent = todayItems.length;
  document.getElementById('psc-tomorrow').textContent = tomorrowItems.length;

  document.getElementById('pstat-today').textContent = todayItems.length;
  document.getElementById('pstat-tomorrow').textContent = tomorrowItems.length;

  // Render sections
  renderAgendaSection('pagenda-today', todayItems, 'pcount-today');
  renderAgendaSection('pagenda-tomorrow', tomorrowItems, 'pcount-tomorrow');

  // Handle search results
  if (APP.searchQuery) {
    document.getElementById('psearch-results-wrap').style.display = 'block';
    renderAgendaSection('psearch-results', filtered, 'pcount-search');
  } else {
    document.getElementById('psearch-results-wrap').style.display = 'none';
  }
}

function renderAgendaSection(containerId, items, countId) {
  const container = document.getElementById(containerId);
  const countEl = document.getElementById(countId);

  if (countEl) countEl.textContent = items.length;

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<div class="pempty"><i class="bi bi-calendar-x"></i><p>Tidak ada agenda</p></div>';
    return;
  }

  container.innerHTML = items.map(d => renderAgendaCard(d)).join('');
}

function renderAgendaCard(d) {
  const status = d['Status Kehadiran'] || 'Hadir';
  const statusClass = status === 'Hadir' ? 'hadir' : status === 'Disposisi' ? 'disp' : 'tidak';
  const statusBg = status === 'Hadir' ? 'bg-hadir' : status === 'Disposisi' ? 'bg-disp' : 'bg-tidak';
  const statusIcon = status === 'Hadir' ? 'check-circle-fill' : status === 'Disposisi' ? 'arrow-right-circle-fill' : 'x-circle-fill';
  const cardId = 'pcard-' + (d['ID'] || Math.random().toString(36).slice(2));

  // Info disposisi
  let disposisiHtml = '';
  if (status === 'Disposisi' && d._disposisiKepada) {
    disposisiHtml = '<div class="pcard-disp-info">' +
      '<i class="bi bi-arrow-right-circle-fill"></i>' +
      '<span>Didisposisikan kepada: <strong>' + esc(d._disposisiKepada) + '</strong></span>' +
      '</div>';
  }

  // File buttons
  let filesHtml = '';
  if (d['URL']) {
    filesHtml += '<button class="pbtn pbtn-file" onclick="openFileViewer(\'' + esc(d['URL']) + '\',\'' + esc(d['Nama File'] || 'Lampiran') + '\')"><i class="bi bi-paperclip"></i> Lampiran</button>';
  }
  if (d['URL Sambutan']) {
    filesHtml += '<button class="pbtn pbtn-sambutan" onclick="openFileViewer(\'' + esc(d['URL Sambutan']) + '\',\'Sambutan\')"><i class="bi bi-file-text"></i> Sambutan</button>';
  }
  if (d['URL Sapaan']) {
    filesHtml += '<button class="pbtn pbtn-sapaan" onclick="openFileViewer(\'' + esc(d['URL Sapaan']) + '\',\'Sapaan\')"><i class="bi bi-people"></i> Sapaan</button>';
  }
  const hasLocation = d['Latitude'] && d['Longitude'] && parseFloat(d['Latitude']) !== 0;
  if (hasLocation) {
    filesHtml += '<button class="pbtn pbtn-maps" onclick="window.open(\'https://www.google.com/maps/search/?api=1&query=' + d['Latitude'] + ',' + d['Longitude'] + '\',\'_blank\')"><i class="bi bi-geo-alt-fill"></i> Google Maps</button>';
    filesHtml += '<button class="pbtn pbtn-peta" onclick="pNavigate(\'peta\');setTimeout(()=>focusAgendaOnMap(\'' + d['ID'] + '\'),500)"><i class="bi bi-map"></i> Lihat di Peta</button>';
  }

  // CP No WA — buat link WA
  let cpHtml = '';
  if (d['CP Nama']) {
    const cpWaRaw = String(d['CP No WA'] || '').replace(/^'+/, '').trim();
    let cpWaLink = '';
    if (cpWaRaw) {
      let cpNum = cpWaRaw.replace(/\D/g, '');
      if (cpNum.startsWith('0')) cpNum = '62' + cpNum.substring(1);
      cpWaLink = ' · <a href="https://wa.me/' + cpNum + '" target="_blank" style="color:#25D366;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:3px"><i class="bi bi-whatsapp"></i> ' + esc(cpWaRaw) + '</a>';
    }
    cpHtml = '<div class="pcard-meta-item"><i class="bi bi-person-circle"></i><span>' + esc(d['CP Nama']) + cpWaLink + '</span></div>';
  }

  // Summary line (collapsed view): tanggal + jam kecil
  const tglShort = d['Tanggal'] ? fmtDate(d['Tanggal']) : '';
  const waktuShort = d['Waktu'] ? d['Waktu'] : '';
  const summaryParts = [tglShort, waktuShort].filter(Boolean);
  const summaryHtml = summaryParts.length
    ? '<div class="pcard-summary">' + summaryParts.join(' · ') + '</div>'
    : '';

  // Detail section (hidden by default)
  const detailHtml =
    '<div class="pcard-detail" id="' + cardId + '-detail" style="display:none">' +
    disposisiHtml +
    '<div class="pcard-meta">' +
    (d['Tanggal'] ? '<div class="pcard-meta-item"><i class="bi bi-calendar-event"></i><span>' + fmtDate(d['Tanggal']) + '</span></div>' : '') +
    (d['Waktu'] ? '<div class="pcard-meta-item"><i class="bi bi-clock"></i><span>' + esc(d['Waktu']) + '</span></div>' : '') +
    (d['Lokasi'] ? '<div class="pcard-meta-item"><i class="bi bi-geo-alt"></i><span>' + esc(d['Lokasi']) + '</span></div>' : '') +
    (d['Pakaian'] ? '<div class="pcard-meta-item"><i class="bi bi-person-bounding-box"></i><span>' + esc(d['Pakaian']) + '</span></div>' : '') +
    (d['Transit'] ? '<div class="pcard-meta-item"><i class="bi bi-signpost-2"></i><span>' + esc(d['Transit']) + '</span></div>' : '') +
    cpHtml +
    '</div>' +
    (d['Keterangan'] && d['Keterangan'] !== '-' ? '<div class="pcard-note">' + esc(d['Keterangan']) + '</div>' : '') +
    (filesHtml ? '<div class="pcard-actions">' + filesHtml + '</div>' : '') +
    '</div>';

  return '<div class="pcard ' + statusClass + '" id="' + cardId + '">' +
    '<div class="pcard-head pcard-toggle" onclick="toggleAgendaCard(\'' + cardId + '\')" style="cursor:pointer;user-select:none">' +
    '<div style="flex:1;min-width:0">' +
    '<div class="pcard-title">' + esc(d['Nama Kegiatan'] || 'Agenda') + '</div>' +
    summaryHtml +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
    '<span class="pcard-badge ' + statusBg + '"><i class="bi bi-' + statusIcon + '"></i> ' + esc(status) + '</span>' +
    '<i class="bi bi-chevron-down pcard-chevron" id="' + cardId + '-ico" style="font-size:.75rem;color:var(--ps);transition:transform .2s"></i>' +
    '</div>' +
    '</div>' +
    detailHtml +
    '</div>';
}

function toggleAgendaCard(cardId) {
  var detail = document.getElementById(cardId + '-detail');
  var ico = document.getElementById(cardId + '-ico');
  if (!detail) return;
  var isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  if (ico) ico.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ─────────────────────────────────────────────────────────────────────────────
//  10. SEARCH & FILTER
// ─────────────────────────────────────────────────────────────────────────────
function pOnSearch(query) {
  APP.searchQuery = query.trim();
  const clearBtn = document.getElementById('psearch-clear');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
  renderAgenda();
}

function pClearSearch() {
  APP.searchQuery = '';
  const input = document.getElementById('psearch-input');
  const clearBtn = document.getElementById('psearch-clear');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  renderAgenda();
}

function pSetFilter(status) {
  APP.filterStatus = status;

  // Update pills
  document.querySelectorAll('.ppill').forEach(p => p.classList.remove('active'));
  const activePill = document.getElementById('ppill-' + (status === 'all' ? 'all' : status === 'Hadir' ? 'hadir' : status === 'Disposisi' ? 'disp' : 'tidak'));
  if (activePill) activePill.classList.add('active');

  renderAgenda();
}

// ─────────────────────────────────────────────────────────────────────────────
//  11. CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
function renderCalendar() {
  const now = new Date();
  if (!PCAL.year) {
    PCAL.year = now.getFullYear();
    PCAL.month = now.getMonth();
  }

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const labelEl = document.getElementById('pcal-label');
  if (labelEl) labelEl.textContent = BULAN[PCAL.month] + ' ' + PCAL.year;

  // Build agenda map
  const agendaMap = {};
  PCAL.agendaData.forEach(d => {
    const tgl = (d['Tanggal'] || '').substring(0, 10);
    if (!tgl) return;
    if (!agendaMap[tgl]) agendaMap[tgl] = [];
    agendaMap[tgl].push(d);
  });

  // Calculate month stats
  const monthStr = PCAL.year + '-' + String(PCAL.month + 1).padStart(2, '0');
  const monthAgenda = PCAL.agendaData.filter(d => (d['Tanggal'] || '').startsWith(monthStr));
  const hadirCount = monthAgenda.filter(d => d['Status Kehadiran'] === 'Hadir').length;
  const dispCount = monthAgenda.filter(d => d['Status Kehadiran'] === 'Disposisi').length;
  const tidakCount = monthAgenda.filter(d => d['Status Kehadiran'] === 'Tidak Hadir').length;

  document.getElementById('pcal-sum-hadir').textContent = hadirCount;
  document.getElementById('pcal-sum-disp').textContent = dispCount;
  document.getElementById('pcal-sum-tidak').textContent = tidakCount;

  // Build calendar grid
  const firstDay = new Date(PCAL.year, PCAL.month, 1).getDay();
  const daysInMonth = new Date(PCAL.year, PCAL.month + 1, 0).getDate();
  const todayStr = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

  let html = '';

  // Headers
  HARI.forEach(h => {
    html += '<div class="pcal-hdr">' + h + '</div>';
  });

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="pcal-cell empty"></div>';
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = PCAL.year + '-' + String(PCAL.month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const items = agendaMap[dateStr] || [];
    const isToday = dateStr === todayStr;

    const statusCounts = { Hadir: 0, Disposisi: 0, 'Tidak Hadir': 0 };
    items.forEach(item => {
      const status = item['Status Kehadiran'] || 'Hadir';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    let dotsHtml = '';
    if (statusCounts.Hadir > 0) dotsHtml += '<div class="pcal-dot-item" style="background:#16a34a"></div>';
    if (statusCounts.Disposisi > 0) dotsHtml += '<div class="pcal-dot-item" style="background:#d97706"></div>';
    if (statusCounts['Tidak Hadir'] > 0) dotsHtml += '<div class="pcal-dot-item" style="background:#e11d48"></div>';

    html += '<div class="pcal-cell' + (isToday ? ' today' : '') + (items.length ? '' : ' empty') + '"' +
      (items.length ? ' onclick="openDayPanel(\'' + dateStr + '\')" style="cursor:pointer"' : '') + '>' +
      '<div class="pcal-num">' + d + '</div>' +
      (dotsHtml ? '<div class="pcal-dots">' + dotsHtml + '</div>' : '') +
      (items.length > 0 ? '<div class="pcal-count">' + items.length + '</div>' : '') +
      '</div>';
  }

  const calEl = document.getElementById('pcalendar');
  if (calEl) calEl.innerHTML = html;
}

function pCalPrev() {
  PCAL.month--;
  if (PCAL.month < 0) {
    PCAL.month = 11;
    PCAL.year--;
  }
  renderCalendar();
}

function pCalNext() {
  PCAL.month++;
  if (PCAL.month > 11) {
    PCAL.month = 0;
    PCAL.year++;
  }
  renderCalendar();
}

function pCalToday() {
  const now = new Date();
  PCAL.year = now.getFullYear();
  PCAL.month = now.getMonth();
  renderCalendar();
}

function openDayPanel(dateStr) {
  const items = PCAL.agendaData.filter(d => (d['Tanggal'] || '').startsWith(dateStr));
  if (!items.length) return;

  const panel = document.getElementById('pcal-day-panel');
  const dateEl = document.getElementById('pcdp-date');
  const countEl = document.getElementById('pcdp-count');
  const contentEl = document.getElementById('pcdp-content');

  if (!panel) return;

  dateEl.textContent = fmtDate(dateStr);
  countEl.textContent = items.length + ' agenda';

  contentEl.innerHTML = items.map(d => renderAgendaCard(d)).join('');

  panel.style.display = 'flex';
}

function pCloseDayPanel() {
  const panel = document.getElementById('pcal-day-panel');
  if (panel) panel.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
//  12. FILE VIEWER
// ─────────────────────────────────────────────────────────────────────────────
function openFileViewer(url, name) {
  const modal = document.getElementById('pfv-modal');
  const nameEl = document.getElementById('pfv-name');
  const dlBtn = document.getElementById('pfv-dl');
  const body = document.getElementById('pfv-body');

  if (!modal) return;

  if (nameEl) nameEl.textContent = name || 'File';
  if (dlBtn) dlBtn.href = url;

  modal.classList.add('open');

  // Ekstrak Google Drive file ID
  var driveId = null;
  var m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  var m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m1) driveId = m1[1];
  else if (m2) driveId = m2[1];

  // Determine file type
  const urlLower = (url || '').toLowerCase().split('?')[0];
  const ext = urlLower.split('.').pop();
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(urlLower);
  const isPdf = ext === 'pdf' || url.toLowerCase().includes('/pdf');
  const isDocx = ext === 'doc' || ext === 'docx';
  const isDriveUrl = url.includes('drive.google.com') || url.includes('docs.google.com');

  if (isImage) {
    // Gambar — gunakan thumbnail Drive jika ada
    const imgUrl = driveId
      ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1200'
      : url;
    body.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto">'
      + '<img src="' + imgUrl + '" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px" '
      + 'onerror="this.src=\'' + url.replace(/'/g, '%27') + '\'" /></div>';

  } else if (driveId) {
    // Google Drive file — gunakan preview embed
    const previewUrl = 'https://drive.google.com/file/d/' + driveId + '/preview';
    body.innerHTML = '<iframe src="' + previewUrl + '" style="width:100%;height:100%;border:none;background:#fff" allowfullscreen></iframe>';

  } else if (isPdf) {
    body.innerHTML = '<iframe src="' + url + '" style="width:100%;height:100%;border:none"></iframe>';

  } else if (isDocx) {
    body.innerHTML = '<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" style="width:100%;height:100%;border:none"></iframe>';

  } else if (isDriveUrl) {
    // URL Drive lain tanpa ID yang terdeteksi — coba embed langsung
    const embedUrl = url.replace('/view', '/preview').replace('/edit', '/preview');
    body.innerHTML = '<iframe src="' + embedUrl + '" style="width:100%;height:100%;border:none;background:#fff" allowfullscreen></iframe>';

  } else {
    // Fallback: Google Docs Viewer
    const viewerUrl = 'https://docs.google.com/viewer?embedded=true&url=' + encodeURIComponent(url);
    body.innerHTML = '<iframe src="' + viewerUrl + '" style="width:100%;height:100%;border:none"></iframe>';
  }
}

function pCloseFileViewer() {
  const modal = document.getElementById('pfv-modal');
  if (modal) modal.classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────────────────
//  13. INIT ON LOAD
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
