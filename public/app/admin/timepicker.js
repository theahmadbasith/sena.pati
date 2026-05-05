// ══════════════════════════════════════════════════════════
//  ANALOG CLOCK TIME PICKER — Custom, works on all devices
//  (PC, Android Chrome, iOS Safari, etc.)
// ══════════════════════════════════════════════════════════
(function() {
  'use strict';

  var _activeInput = null;
  var _pickerEl = null;
  var _mode = 'hour'; // 'hour' | 'minute'
  var _hour = 0;
  var _minute = 0;
  var _isDragging = false;

  // ── Build picker DOM once ──
  function _buildPicker() {
    if (_pickerEl) return;
    var el = document.createElement('div');
    el.id = 'atp-picker';
    el.innerHTML = [
      '<div id="atp-backdrop"></div>',
      '<div id="atp-panel">',
      '  <div id="atp-display">',
      '    <span id="atp-h" class="atp-seg active">00</span>',
      '    <span class="atp-colon">:</span>',
      '    <span id="atp-m" class="atp-seg">00</span>',
      '  </div>',
      '  <div id="atp-clock-wrap">',
      '    <canvas id="atp-canvas" width="240" height="240"></canvas>',
      '  </div>',
      '  <div id="atp-footer">',
      '    <button id="atp-cancel" type="button">Batal</button>',
      '    <button id="atp-ok" type="button">OK</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(el);
    _pickerEl = el;

    // Events
    document.getElementById('atp-backdrop').addEventListener('click', _close);
    document.getElementById('atp-cancel').addEventListener('click', _close);
    document.getElementById('atp-ok').addEventListener('click', _confirm);
    document.getElementById('atp-h').addEventListener('click', function() { _setMode('hour'); });
    document.getElementById('atp-m').addEventListener('click', function() { _setMode('minute'); });

    var canvas = document.getElementById('atp-canvas');
    // Mouse events
    canvas.addEventListener('mousedown', _onPointerDown);
    canvas.addEventListener('mousemove', _onPointerMove);
    canvas.addEventListener('mouseup', _onPointerUp);
    // Touch events (iOS Safari + Android)
    canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', _onTouchMove, { passive: false });
    canvas.addEventListener('touchend', _onTouchEnd, { passive: false });
  }

  function _getCanvasPos(e) {
    var canvas = document.getElementById('atp-canvas');
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function _onPointerDown(e) {
    _isDragging = true;
    _handleCanvasClick(_getCanvasPos(e));
  }
  function _onPointerMove(e) {
    if (!_isDragging) return;
    _handleCanvasClick(_getCanvasPos(e));
  }
  function _onPointerUp(e) {
    if (!_isDragging) return;
    _isDragging = false;
    _handleCanvasClick(_getCanvasPos(e));
    if (_mode === 'hour') { setTimeout(function() { _setMode('minute'); }, 120); }
  }

  function _onTouchStart(e) {
    e.preventDefault();
    _isDragging = true;
    var t = e.touches[0];
    _handleCanvasClick(_getTouchPos(t));
  }
  function _onTouchMove(e) {
    e.preventDefault();
    if (!_isDragging) return;
    var t = e.touches[0];
    _handleCanvasClick(_getTouchPos(t));
  }
  function _onTouchEnd(e) {
    e.preventDefault();
    if (!_isDragging) return;
    _isDragging = false;
    if (_mode === 'hour') { setTimeout(function() { _setMode('minute'); }, 120); }
  }

  function _getTouchPos(touch) {
    var canvas = document.getElementById('atp-canvas');
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  function _handleCanvasClick(pos) {
    var cx = 120, cy = 120;
    var dx = pos.x - cx, dy = pos.y - cy;
    var angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    if (_mode === 'hour') {
      var h = Math.round(angle / (2 * Math.PI) * 24);
      if (h === 24) h = 0;
      _hour = h;
    } else {
      var m = Math.round(angle / (2 * Math.PI) * 60);
      if (m === 60) m = 0;
      _minute = m;
    }
    _updateDisplay();
    _drawClock();
  }

  function _setMode(mode) {
    _mode = mode;
    var hEl = document.getElementById('atp-h');
    var mEl = document.getElementById('atp-m');
    if (hEl) hEl.classList.toggle('active', mode === 'hour');
    if (mEl) mEl.classList.toggle('active', mode === 'minute');
    _drawClock();
  }

  function _updateDisplay() {
    var hEl = document.getElementById('atp-h');
    var mEl = document.getElementById('atp-m');
    if (hEl) hEl.textContent = String(_hour).padStart(2, '0');
    if (mEl) mEl.textContent = String(_minute).padStart(2, '0');
  }

  function _drawClock() {
    var canvas = document.getElementById('atp-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2;
    var R = cx - 8; // outer radius

    // Detect dark mode
    var isDark = document.body.classList.contains('dark-mode');
    var bgColor    = isDark ? '#1c2128' : '#ffffff';
    var faceColor  = isDark ? '#22272e' : '#f8fafc';
    var textColor  = isDark ? '#e6edf3' : '#1e293b';
    var mutedColor = isDark ? '#8b949e' : '#64748b';
    var accentColor = '#1e6fd9';
    var handColor   = '#1e6fd9';

    ctx.clearRect(0, 0, W, H);

    // Face
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = faceColor;
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (_mode === 'hour') {
      // 24-hour mode: inner ring (12-23) + outer ring (0-11)
      for (var h = 0; h < 24; h++) {
        var isInner = h >= 12;
        var rPos = isInner ? R * 0.58 : R * 0.82;
        var angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
        var tx = cx + rPos * Math.cos(angle);
        var ty = cy + rPos * Math.sin(angle);
        var isSelected = h === _hour;

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(tx, ty, 16, 0, 2 * Math.PI);
          ctx.fillStyle = accentColor;
          ctx.fill();
        }

        ctx.font = isInner ? 'bold 11px system-ui' : 'bold 13px system-ui';
        ctx.fillStyle = isSelected ? '#ffffff' : (isInner ? mutedColor : textColor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(h).padStart(2, '0'), tx, ty);
      }

      // Hand
      var selAngle = (_hour / 24) * 2 * Math.PI - Math.PI / 2;
      var selR = _hour >= 12 ? R * 0.58 : R * 0.82;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + selR * Math.cos(selAngle), cy + selR * Math.sin(selAngle));
      ctx.strokeStyle = handColor;
      ctx.lineWidth = 2;
      ctx.stroke();

    } else {
      // Minute mode: 0-55 in steps of 5, plus fine ticks
      // Draw minute ticks
      for (var tick = 0; tick < 60; tick++) {
        var tickAngle = (tick / 60) * 2 * Math.PI - Math.PI / 2;
        var isMajor = tick % 5 === 0;
        var r1 = R - (isMajor ? 10 : 5);
        var r2 = R - 2;
        ctx.beginPath();
        ctx.moveTo(cx + r1 * Math.cos(tickAngle), cy + r1 * Math.sin(tickAngle));
        ctx.lineTo(cx + r2 * Math.cos(tickAngle), cy + r2 * Math.sin(tickAngle));
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)';
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
      }

      // Draw minute numbers (0,5,10,...,55)
      for (var m5 = 0; m5 < 60; m5 += 5) {
        var mAngle = (m5 / 60) * 2 * Math.PI - Math.PI / 2;
        var mR = R * 0.78;
        var mx = cx + mR * Math.cos(mAngle);
        var my = cy + mR * Math.sin(mAngle);
        var isSelM = m5 === Math.round(_minute / 5) * 5 && Math.abs(_minute - m5) < 3;
        var isExact = _minute === m5;

        if (isExact) {
          ctx.beginPath();
          ctx.arc(mx, my, 16, 0, 2 * Math.PI);
          ctx.fillStyle = accentColor;
          ctx.fill();
        }

        ctx.font = 'bold 13px system-ui';
        ctx.fillStyle = isExact ? '#ffffff' : textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(m5).padStart(2, '0'), mx, my);
      }

      // Selected minute dot (for non-5 values)
      var selMAngle = (_minute / 60) * 2 * Math.PI - Math.PI / 2;
      var selMR = R * 0.78;
      if (_minute % 5 !== 0) {
        ctx.beginPath();
        ctx.arc(cx + selMR * Math.cos(selMAngle), cy + selMR * Math.sin(selMAngle), 6, 0, 2 * Math.PI);
        ctx.fillStyle = accentColor;
        ctx.fill();
      }

      // Hand
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + selMR * Math.cos(selMAngle), cy + selMR * Math.sin(selMAngle));
      ctx.strokeStyle = handColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = accentColor;
    ctx.fill();
  }

  function _open(inputEl) {
    _buildPicker();
    _activeInput = inputEl;

    // Parse existing value
    var val = inputEl.value || '';
    var parts = val.match(/^(\d{1,2}):(\d{2})$/);
    _hour = parts ? parseInt(parts[1]) : 0;
    _minute = parts ? parseInt(parts[2]) : 0;
    _mode = 'hour';

    _updateDisplay();
    _setMode('hour');
    _drawClock();

    _pickerEl.classList.add('open');
    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
  }

  function _close() {
    if (_pickerEl) _pickerEl.classList.remove('open');
    document.body.style.overflow = '';
    _activeInput = null;
    _isDragging = false;
  }

  function _confirm() {
    if (_activeInput) {
      _activeInput.value = String(_hour).padStart(2, '0') + ':' + String(_minute).padStart(2, '0');
      // Trigger change event for any listeners
      var evt = new Event('change', { bubbles: true });
      _activeInput.dispatchEvent(evt);
    }
    _close();
  }

  // ── Public API ──
  window.initTimePickers = function(container) {
    var root = container || document;
    root.querySelectorAll('[data-timepicker]').forEach(function(inp) {
      if (inp._atpBound) return;
      inp._atpBound = true;
      inp.readOnly = true;
      inp.style.cursor = 'pointer';
      inp.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        _open(inp);
      });
      inp.addEventListener('focus', function(e) {
        e.preventDefault();
        inp.blur();
        _open(inp);
      });
    });
  };

  window.toggleJamSelesai = function(inputId, btn) {
    var el = document.getElementById(inputId);
    if (!el) return;
    var isTimePicker = el.hasAttribute('data-timepicker');
    if (isTimePicker) {
      // Switch to text mode
      el.removeAttribute('data-timepicker');
      el.readOnly = false;
      el.style.cursor = '';
      el._atpBound = false;
      el.value = 'Selesai';
      btn.textContent = 'Pilih Jam';
    } else {
      // Switch back to time picker mode
      el.setAttribute('data-timepicker', '');
      el.readOnly = true;
      el.style.cursor = 'pointer';
      el._atpBound = false;
      el.value = '';
      btn.textContent = 'Teks Selesai';
      initTimePickers(el.parentElement);
    }
  };

})();

