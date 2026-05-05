// ══════════════════════════════════════════════════════════
//  API CLIENT — Komunikasi dengan Vercel API Route
// ══════════════════════════════════════════════════════════
const BASE_URL = (function () {
  const host = window.location.origin;
  if (host.startsWith('file://')) return 'http://localhost:3000';
  return host;
})();

/**
 * Fungsi utilitas utama untuk memanggil API
 * @param {string} action - Nama endpoint/aksi
 * @param {object} payload - Data yang dikirim ke server
 */
async function callAPI(action, payload) {
  try {
    const res = await fetch(BASE_URL + '/api/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, payload: payload || {} })
    });

    let data = null;
    try { data = await res.json(); } catch (e) { /* Abaikan jika bukan JSON */ }

    if (!res.ok) {
      if (data && data.message) throw new Error(data.message);
      throw new Error('HTTP ' + res.status);
    }
    return data;
  } catch (err) {
    const badge = document.getElementById('api-status-badge');
    if (badge) {
      badge.className = 'api-status error';
      badge.innerHTML = '<i class="bi bi-circle-fill"></i> Offline';
    }
    throw err;
  }
}

// ══════════════════════════════════════════════════════════
//  GLOBAL STATE
// ══════════════════════════════════════════════════════════
const APP = { user: null, currentPage: 'dashboard' };
let currentEditData = null;

// ══════════════════════════════════════════════════════════
//  UI UTILS: SPINNER & TOAST NOTIFICATION
// ══════════════════════════════════════════════════════════

/**
 * showSpinner(label, steps)
 * steps: array of string — tahapan proses, opsional
 * Contoh: showSpinner('Menyimpan...', ['Membaca file', 'Mengunggah ke Drive', 'Menyimpan data'])
 */
function showSpinner(label, steps) {
  document.getElementById('spinner-label').textContent = label || 'Memproses...';
  document.getElementById('spinner-sub').textContent = 'Mohon tunggu sebentar';

  const progressWrap = document.getElementById('spinner-progress-wrap');
  const stepsEl = document.getElementById('spinner-steps');
  const bar = document.getElementById('spinner-progress-bar');
  const pct = document.getElementById('spinner-progress-pct');

  if (steps && steps.length) {
    // Tampilkan progress bar + step list
    progressWrap.style.display = 'block';
    stepsEl.style.display = 'block';
    bar.style.width = '0%';
    if (pct) pct.textContent = '0%';
    stepsEl.innerHTML = steps.map(function (s, i) {
      return '<div class="sp-step" id="sp-step-' + i + '"><span class="sp-dot"></span><span>' + s + '</span></div>';
    }).join('');
    // Aktifkan step pertama
    const first = document.getElementById('sp-step-0');
    if (first) first.classList.add('active');
  } else {
    progressWrap.style.display = 'none';
    stepsEl.style.display = 'none';
  }

  document.getElementById('spinner-overlay').classList.add('active');
}

/**
 * setSpinnerStep(index, totalSteps) — tandai step selesai dan aktifkan berikutnya
 */
function setSpinnerStep(index, totalSteps) {
  const bar = document.getElementById('spinner-progress-bar');
  const pct = document.getElementById('spinner-progress-pct');

  // Tandai step sebelumnya sebagai done
  for (let i = 0; i < index; i++) {
    const el = document.getElementById('sp-step-' + i);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
  }
  // Aktifkan step saat ini
  const cur = document.getElementById('sp-step-' + index);
  if (cur) { cur.classList.remove('done'); cur.classList.add('active'); }

  // Update progress bar
  if (bar && totalSteps) {
    const progress = Math.round((index / totalSteps) * 100);
    bar.style.width = progress + '%';
    if (pct) pct.textContent = progress + '%';
  }
}

/**
 * setSpinnerLabel(label, sub) — update teks label tanpa menutup spinner
 */
function setSpinnerLabel(label, sub) {
  const lbl = document.getElementById('spinner-label');
  const sub2 = document.getElementById('spinner-sub');
  if (lbl && label) lbl.textContent = label;
  if (sub2 && sub !== undefined) sub2.textContent = sub;
}

/**
 * finishSpinner() — tandai semua step selesai sebelum hideSpinner
 */
function finishSpinner(totalSteps) {
  const bar = document.getElementById('spinner-progress-bar');
  const pct = document.getElementById('spinner-progress-pct');
  if (bar) bar.style.width = '100%';
  if (pct) pct.textContent = '100%';
  if (totalSteps) {
    for (let i = 0; i < totalSteps; i++) {
      const el = document.getElementById('sp-step-' + i);
      if (el) { el.classList.remove('active'); el.classList.add('done'); }
    }
  }
}

function hideSpinner() {
  document.getElementById('spinner-overlay').classList.remove('active');
  // Reset progress
  const bar = document.getElementById('spinner-progress-bar');
  const pct = document.getElementById('spinner-progress-pct');
  if (bar) bar.style.width = '0%';
  if (pct) pct.textContent = '0%';
}

// ── Modal scroll-lock helpers ──
// Setiap kali modal dibuka, panggil lockScroll(); saat ditutup, unlockScroll()
let _scrollLockCount = 0;
function lockScroll() {
  _scrollLockCount++;
  if (_scrollLockCount === 1) {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflowY = 'scroll';
    document.body.dataset.scrollY = scrollY;
  }
}
function unlockScroll() {
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if (_scrollLockCount === 0) {
    const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflowY = '';
    window.scrollTo(0, scrollY);
  }
}

function showToast(msg, type) {  const icons = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' };
  const el = document.createElement('div');
  el.className = 'toast-msg ' + (type || 'info');
  el.innerHTML = '<i class="bi bi-' + (icons[type] || icons.info) + '"></i><span>' + esc(msg) + '</span>';
  document.getElementById('toast-container').appendChild(el);
  setTimeout(function () { el.remove(); }, 4500);
}

// ══════════════════════════════════════════════════════════
//  THEME MANAGEMENT (DARK/LIGHT MODE)
// ══════════════════════════════════════════════════════════
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('senapati_theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

function initTheme() {
  const savedTheme = localStorage.getItem('senapati_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    const ti = document.getElementById('theme-icon');
    if (ti) ti.className = 'bi bi-sun-fill';
  }
}

// ══════════════════════════════════════════════════════════
//  WIDGET CLOCK
// ══════════════════════════════════════════════════════════
function startClock() {
  function tick() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = now.toLocaleTimeString('id-ID');
    const dt = document.getElementById('info-date');
    if (dt) dt.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}
