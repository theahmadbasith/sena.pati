// ══════════════════════════════════════════════════════════
//  INITIALIZATION & EVENT LISTENERS
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  initTheme();

  // ── Init time picker pada semua input statis ──
  function _initAllTimePickers() {
    initTimePickers(document);
  }
  _initAllTimePickers();
  setTimeout(_initAllTimePickers, 200);

  // Fallback window.onload
  window.addEventListener('load', _initAllTimePickers);

  // ── Restore session admin jika masih valid (< 1 jam) ──
  (function restoreSession() {
    try {
      const raw = localStorage.getItem('app_session');
      if (!raw) return;
      const sess = JSON.parse(raw);
      const age = Date.now() - (sess.ts || 0);
      if (age > 60 * 60 * 1000) {
        // Session expired
        localStorage.removeItem('app_session');
        return;
      }
      // Session masih valid — langsung masuk tanpa login ulang
      APP.user = sess.user;
      _applyUserToShell(sess.user);
      applyRoleVisibility(sess.user.role);
      startClock();
      navigateTo('dashboard');
      // Preload pejabat disposisi untuk datalist
      setTimeout(function() { _ensurePejabatCache(); }, 500);
    } catch (e) {
      localStorage.removeItem('app_session');
    }
  })();

  // Enter key untuk login
  ['login-username', 'login-password'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  });

  // Event listener untuk drag & drop uploader
  document.querySelectorAll('.file-drop').forEach(function (zone) {
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      const fileInput = zone.querySelector('input[type="file"]');
      const infoEl = zone.querySelector('.drop-name');

      if (fileInput && e.dataTransfer.files[0]) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fileInput.files = dt.files;
        const f = e.dataTransfer.files[0];
        if (infoEl) infoEl.textContent = '📎 ' + f.name + ' (' + (f.size / 1024).toFixed(1) + ' KB)';
      }
    });
  });
});
