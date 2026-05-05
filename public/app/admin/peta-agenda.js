// ══════════════════════════════════════════════════════════════════════════════
//  PETA AGENDA BUPATI — SENAPATI v1.0
//  Sistem Pemetaan Interaktif Agenda Kegiatan Bupati Ponorogo
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  1. UTILITAS DOM & KONFIGURASI DASAR
// ─────────────────────────────────────────────────────────────────────────────

function om(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id; 
    if (el) { el.style.display = 'flex'; setTimeout(function () { el.classList.add('show'); }, 10); } 
}

function cm(id) { 
    var el = typeof id === 'string' ? document.getElementById(id) : id; 
    if (el) { el.classList.remove('show'); setTimeout(function () { el.style.display = 'none'; }, 200); } 
}

function G(id) { return document.getElementById(id); }

var PETA_EMBED_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.PETA_EMBED_URL) ? window.CONFIG.PETA_EMBED_URL : '';

// Koordinat Tengah (Pendopo) hanya untuk centering, tanpa penanda pin
var PETA_CENTER = [-7.870481, 111.462307];
var PETA_ZOOM = 15;

// ─────────────────────────────────────────────────────────────────────────────
//  2. STATE APLIKASI
// ─────────────────────────────────────────────────────────────────────────────
var _petaFullscreen = false;
var _lfMap = null;
var _lfMarkersLP = [];
var _lfMarkersDF = [];
var _lfLayerGroupDF = null;
var _layerData = [];

var _drawnItems = null;
var _drawControl = null;
var _activeDrawHandler = null;
var _activeDrawMode = null;
var _drawPanelOpen = false;
var _drawnMeta = {};
var _pendingLayer = null;
var _pendingLayerType = null;
var _metaWarna = '#1e6fd9';

var _pickCoordMode = false;
var _pickTempMarker = null;
var _currentBaseLayer = null;
var _lfTileLayers = {};
var _userPickedTileLayer = false;
var _navPanelOpen = false;
var _agendaSidebarCollapsed = false;

var _logoCacheB64 = null;
var _simbolIconCache = {}; 

// ─────────────────────────────────────────────────────────────────────────────
//  3. KONSTANTA & PRESET (WARNA, IKON, TILEMAP)
// ─────────────────────────────────────────────────────────────────────────────
var DRAW_WARNA_PRESET = [
    { hex: '#1e6fd9', lbl: 'Biru' }, { hex: '#c0392b', lbl: 'Merah' },
    { hex: '#0d9268', lbl: 'Hijau' }, { hex: '#d97706', lbl: 'Kuning' },
    { hex: '#7c3aed', lbl: 'Ungu' }, { hex: '#0891b2', lbl: 'Tosca' },
    { hex: '#e67e22', lbl: 'Oranye' }, { hex: '#e91e63', lbl: 'Pink' },
    { hex: '#607d8b', lbl: 'Abu' }, { hex: '#1a1a2e', lbl: 'Hitam' },
    { hex: '#f59e0b', lbl: 'Emas' }, { hex: '#10b981', lbl: 'Zamrud' }
];

var SIMBOL_DEF = [
    { id: 'Hadir', ico: 'fa-check-circle', label: 'Hadir', warna: '#16a34a' },
    { id: 'Tidak Hadir', ico: 'fa-times-circle', label: 'Tidak Hadir', warna: '#e11d48' },
    { id: 'Disposisi', ico: 'fa-share', label: 'Disposisi', warna: '#b45309' },
    { id: 'Belum Konfirmasi', ico: 'fa-question-circle', label: 'Belum Konfirmasi', warna: '#0891b2' }
];

var WARNA_PRESET = [
    '#1e6fd9', '#c0392b', '#0d9268', '#d97706', '#7c3aed', '#0891b2',
    '#e67e22', '#2ecc71', '#e91e63', '#607d8b', '#ff5722', '#795548'
];

var TILE_LAYERS = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', label: 'OpenStreetMap', maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Esri', label: 'Satelit Esri', maxZoom: 19 },
    hybrid: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Hybrid', maxZoom: 20 },
    google_sat: { url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Sat', maxZoom: 20 },
    carto: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: 'CartoDB', label: 'CartoDB Light', maxZoom: 19 },
    carto_dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: 'CartoDB', label: 'CartoDB Dark', maxZoom: 19 },
    topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: 'OpenTopoMap', label: 'Topografi', maxZoom: 17 }
};

var FA_UNICODE = {
    'fa-route': '\uf4d7', 'fa-triangle-exclamation': '\uf071', 'fa-shield-halved': '\uf3ed',
    'fa-store': '\uf54e', 'fa-draw-polygon': '\uf5ee', 'fa-building': '\uf1ad',
    'fa-video': '\uf03d', 'fa-square-parking': '\uf540', 'fa-map-pin': '\uf276',
    'fa-location-dot': '\uf3c5', 'fa-camera': '\uf030', 'fa-road': '\uf018',
    'fa-map-location-dot': '\uf5a0'
};

// ─────────────────────────────────────────────────────────────────────────────
//  4. FUNGSI UTILITAS BANTUAN
// ─────────────────────────────────────────────────────────────────────────────

function toast(msg, type) {
    var mappedType = 'info';
    if (type === 'ok') mappedType = 'success';
    if (type === 'er') mappedType = 'error';
    if (typeof showToast === 'function') showToast(msg, mappedType);
}

function hexToRgb(hex) {
    hex = (hex || '607d8b').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

function getSimbolDef(id) {
    var LEGACY = {
        'area': 'rute', 'marker': 'posjaga', 'pin': 'posjaga', 'polyline': 'rute', 'polygon': 'batas',
        'dot': 'hotspot', 'line': 'rute', 'poly': 'batas', 'camera': 'kamera', 'foto': 'kamera',
        'building': 'bangunan', 'store': 'toko', 'shield': 'posjaga', 'warning': 'hotspot', 'route': 'rute'
    };
    var r = LEGACY[id] || id;
    for (var i = 0; i < SIMBOL_DEF.length; i++) if (SIMBOL_DEF[i].id === r) return SIMBOL_DEF[i];
    return SIMBOL_DEF[0];
}

/**
 * Deteksi dan format nomor HP (Penanggung Jawab) menjadi link WA
 */
function formatWA(text) {
    if (!text) return '-';
    // Cari pola nomor HP Indonesia (contoh: 08xx, 628xx, +628xx)
    var phoneRegex = /(\+62|62|0)[0-9 \-\(\)]{8,14}/g;
    var match = text.match(phoneRegex);
    
    if (match) {
        var numStr = match[0];
        var cleanNum = numStr.replace(/\D/g, ''); // Hapus semua karakter non-angka
        if (cleanNum.startsWith('0')) cleanNum = '62' + cleanNum.substring(1);
        
        var waLink = '<a href="https://wa.me/' + cleanNum + '" target="_blank" style="display:inline-flex; align-items:center; gap:4px; color:#10b981; font-weight:800; text-decoration:none; background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:6px; margin-top:3px;"><i class="fab fa-whatsapp"></i> Chat WA (' + numStr.trim() + ')</a>';
        
        // Gantikan nomor aslinya dengan tombol WA (Sisa namanya tetap dibiarkan)
        return text.replace(numStr, '<br>' + waLink);
    }
    return text;
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. RENDER IKON PIN (CANVAS)
// ─────────────────────────────────────────────────────────────────────────────

function _drawPinToCanvas(ctx, faIco, warna, cw, ch) {
    var c = warna || '#607d8b';
    var sx = cw / 32, sy = ch / 42;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000'; ctx.beginPath();
    ctx.ellipse(16 * sx, 39 * sy, 5 * sx, 2.5 * sy, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.save(); ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(16 * sx, 0);
    ctx.bezierCurveTo(9.37 * sx, 0, 4 * sx, 5.37 * sy, 4 * sx, 12 * sy);
    ctx.bezierCurveTo(4 * sx, 21.5 * sy, 16 * sx, 40 * sy, 16 * sx, 40 * sy);
    ctx.bezierCurveTo(16 * sx, 40 * sy, 28 * sx, 21.5 * sy, 28 * sx, 12 * sy);
    ctx.bezierCurveTo(28 * sx, 5.37 * sy, 22.63 * sx, 0, 16 * sx, 0);
    ctx.closePath(); ctx.fill(); ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.arc(16 * sx, 12 * sy, 8 * sx, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.arc(16 * sx, 12 * sy, 6.5 * sx, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    var uni = FA_UNICODE[faIco] || FA_UNICODE['fa-map-pin'];
    ctx.save(); ctx.fillStyle = c;
    ctx.font = 'bold ' + Math.round(10 * sx) + 'px "Font Awesome 6 Free"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(uni, 16 * sx, 12 * sy); ctx.restore();
}

function _makePinPng(faIco, warna) {
    var SIZE = 4;
    var cv = document.createElement('canvas');
    cv.width = 32 * SIZE; cv.height = 42 * SIZE;
    var ctx = cv.getContext('2d');
    _drawPinToCanvas(ctx, faIco, warna, cv.width, cv.height);
    return cv.toDataURL('image/png');
}

function _precacheSimbolIcons() {
    var pairs = [];
    SIMBOL_DEF.forEach(function (s) { pairs.push({ ico: s.ico, warna: s.warna }); });
    pairs.forEach(function (p) {
        var key = p.ico + '_' + p.warna;
        if (!_simbolIconCache[key]) {
            _simbolIconCache[key] = _makePinPng(p.ico, p.warna);
        }
    });
}

function _getSimbolPng(faIco, warna) {
    var key = (faIco || 'fa-map-pin') + '_' + (warna || '#607d8b');
    if (!_simbolIconCache[key]) _simbolIconCache[key] = _makePinPng(faIco, warna);
    return _simbolIconCache[key];
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. INJEKSI CSS DINAMIS
// ─────────────────────────────────────────────────────────────────────────────
function _injectPetaStyles() {
    if (G('peta-dyn-style')) return;
    var s = document.createElement('style');
    s.id = 'peta-dyn-style';
    // Menyesuaikan popup leaflet agar ramah Dark Mode, menambahkan styling truncate teks
    s.textContent = [
        '.peta-btn{padding:7px 14px;border-radius:10px;background:var(--card, #fff);color:var(--text-main, var(--text, #1e293b));border:1px solid var(--border, #e2e8f0);font-size:.78rem;font-weight:700;font-family:var(--font);cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s;box-shadow:0 2px 6px rgba(0,0,0,.05);}',
        '.peta-btn:hover{background:var(--bg-hover, #f8fafc);transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.08);}',
        '.peta-btn-primary{background:linear-gradient(135deg, #1e6fd9, #2563eb);color:#fff;border:none;box-shadow:0 3px 12px rgba(37,99,235,.3);}',
        '.peta-btn-primary:hover{background:linear-gradient(135deg, #1d4ed8, #1e40af);color:#fff;transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,.4);}',
        '.peta-fs-active{position:fixed!important;inset:0!important;z-index:9999!important;width:100vw!important;height:100dvh!important;border-radius:0!important;padding:0!important;background:var(--pb,#f1f5f9)!important;}',
        '.peta-exit-fs-btn{display:none!important;position:fixed;top:16px;right:16px;z-index:10000;background:var(--sb,#fff);color:var(--pt,#1e293b);border:1px solid var(--border);border-radius:10px;padding:10px 18px;font-size:.85rem;font-weight:700;cursor:pointer;align-items:center;gap:8px;box-shadow:var(--sh3);transition:all .2s;}',
        '.peta-exit-fs-btn:hover{background:var(--red-lt);color:var(--red);transform:scale(1.05);}',
        '.peta-fs-active .peta-exit-fs-btn{display:flex!important;}',
        
        /* Modifikasi Popup (Dark Mode Compatible) */
        '.leaflet-popup-content-wrapper{background:var(--card, rgba(255,255,255,0.95))!important; color:var(--text-main, var(--text, #1e293b))!important; backdrop-filter:blur(10px)!important; border:1px solid var(--border, rgba(255,255,255,0.5))!important; border-radius:16px!important; box-shadow:0 12px 36px rgba(0,0,0,.15),0 4px 12px rgba(0,0,0,.08)!important; padding:0!important; overflow:hidden!important;}',
        '.leaflet-popup-content{margin:16px!important;font-family:var(--font)!important;font-size:.78rem!important;line-height:1.6!important;}',
        '.leaflet-popup-tip-container{display:none!important;}',
        '.leaflet-popup-tip{display:none!important;}',
        '.leaflet-popup-close-button{color:var(--text-muted, var(--muted, #64748b))!important;font-size:16px!important;top:6px!important;right:8px!important;background:transparent!important;}',
        '.leaflet-popup-close-button:hover{color:var(--red)!important;}',
        '.lf-clean-popup .leaflet-popup-content-wrapper{border-radius:12px!important;box-shadow:0 8px 28px rgba(0,0,0,.16)!important;border:1px solid var(--border)!important;}',
        '.lf-draw-toggle{position:absolute;bottom:30px;right:10px;z-index:1000;width:36px;height:36px;border-radius:50%;background:var(--card,#fff);color:var(--text-main,#1e293b);border:1px solid var(--border,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:.88rem;cursor:pointer;box-shadow:0 3px 14px rgba(0,0,0,.18);transition:all .15s;}',
        '.lf-draw-toggle:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9;transform:scale(1.06);}',
        '.lf-draw-toggle.active{background:#1e6fd9;color:#fff;border-color:#1e6fd9;box-shadow:0 0 0 2px var(--card,#fff),0 0 0 4px #1e6fd9;}',
        '.lf-draw-panel{position:absolute;bottom:74px;right:10px;z-index:1001;background:var(--card,#fff);backdrop-filter:blur(18px);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:8px 5px;display:flex;flex-direction:column;gap:1px;box-shadow:0 8px 28px rgba(0,0,0,.14);min-width:148px;transform-origin:bottom right;transition:opacity .18s,transform .18s;}',
        '.lf-draw-panel.hidden{opacity:0;pointer-events:none;transform:scale(.88);}',
        '.lf-draw-panel.visible{opacity:1;pointer-events:auto;transform:scale(1);}',
        '.lf-draw-panel-lbl{font-size:.52rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted,#64748b);padding:3px 10px 5px;}',
        '.lf-draw-sep{height:1px;background:var(--border,#e2e8f0);margin:3px 5px;}',
        '.lf-draw-item{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:8px;border:none;background:transparent;color:var(--text-main,#1e293b);font-size:.68rem;font-weight:700;cursor:pointer;text-align:left;width:100%;font-family:var(--font);transition:background .12s,color .12s;}',
        '.lf-draw-item:hover{background:var(--body-bg,#f1f5f9);color:var(--text-main,#1e293b);}',
        '.lf-draw-item.active{background:rgba(30,111,217,.12);color:#1e6fd9;}',
        '.lf-draw-item.danger:hover{background:rgba(192,57,43,.1);color:#c0392b;}',
        '.lf-draw-item i{width:14px;text-align:center;font-size:.76rem;flex-shrink:0;}',
        '.lf-meta-overlay{position:absolute;bottom:0;left:0;right:0;z-index:1100;background:var(--card,#fff);backdrop-filter:blur(16px);border-top:1px solid var(--border,#e2e8f0);padding:14px 16px 16px;border-radius:0 0 12px 12px;transform:translateY(100%);transition:transform .22s cubic-bezier(.34,1.4,.64,1);box-shadow:0 -4px 20px rgba(0,0,0,.08);}',
        '.lf-meta-overlay.show{transform:translateY(0);}',
        '.lf-meta-title{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted,#64748b);margin-bottom:10px;display:flex;align-items:center;gap:6px;}',
        '.lf-meta-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}',
        '.lf-meta-input{width:100%;padding:7px 9px;background:var(--body-bg,#f1f5f9);border:1px solid var(--border,#e2e8f0);border-radius:7px;color:var(--text-main,#1e293b);font-family:var(--font);font-size:.72rem;outline:none;transition:border-color .14s,background .14s;}',
        '.lf-meta-input:focus{border-color:#1e6fd9;background:rgba(30,111,217,.06);}',
        '.lf-meta-input::placeholder{color:var(--text-muted,#94a3b8);}',
        '.lf-meta-warna-grid{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}',
        '.lf-meta-swatch{width:22px;height:22px;border-radius:5px;cursor:pointer;border:2.5px solid transparent;transition:transform .12s,border-color .12s;flex-shrink:0;}',
        '.lf-meta-swatch:hover{transform:scale(1.18);}',
        '.lf-meta-swatch.on{border-color:var(--text-main,#1e293b);transform:scale(1.18);}',
        '.lf-meta-color-custom{display:flex;align-items:center;gap:6px;margin-bottom:10px;}',
        '.lf-meta-color-inp{width:28px;height:28px;border:none;border-radius:5px;cursor:pointer;background:none;padding:0;}',
        '.lf-meta-color-lbl{font-size:.62rem;font-family:var(--mono);color:var(--text-muted,#64748b);}',
        '.lf-meta-actions{display:flex;gap:6px;}',
        '.lf-meta-btn-ok{flex:1;padding:7px;background:#1e6fd9;color:#fff;border:none;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:5px;}',
        '.lf-meta-btn-ok:hover{background:#1660c5;}',
        '.lf-meta-btn-cancel{padding:7px 12px;background:var(--body-bg,#f1f5f9);color:var(--text-muted,#64748b);border:1px solid var(--border,#e2e8f0);border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:var(--font);}',
        '.lf-meta-btn-cancel:hover{background:var(--border,#e2e8f0);}',
        '.lf-meta-msr{margin-bottom:10px;background:rgba(30,111,217,.08);border:1px solid rgba(30,111,217,.2);border-radius:7px;padding:7px 10px;font-size:.66rem;color:#1e6fd9;display:flex;align-items:center;gap:6px;}',
        '.lf-tip-clean{background:rgba(255,255,255,.94)!important;color:#1e3a5f!important;border:1px solid rgba(30,111,217,.25)!important;border-radius:6px!important;padding:4px 9px!important;font-family:var(--font)!important;font-size:.67rem!important;font-weight:700!important;box-shadow:0 2px 10px rgba(0,0,0,.1)!important;pointer-events:none!important;white-space:nowrap!important;}',
        '.lf-tip-clean b{color:#0d7a5f;font-family:var(--mono);}',
        '.lf-pick-cursor .leaflet-container{cursor:crosshair!important;}',
        '.lf-pick-banner{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1200;background:rgba(13,146,104,.92);color:#fff;padding:6px 18px;border-radius:20px;font-size:.68rem;font-weight:800;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.35);display:flex;align-items:center;gap:7px;pointer-events:auto;font-family:var(--font);}',
        '.lf-pick-cancel{background:rgba(255,255,255,.18);border:none;color:#fff;padding:2px 8px;border-radius:10px;font-size:.62rem;font-weight:800;cursor:pointer;font-family:var(--font);margin-left:6px;}',
        '@keyframes peta-pulse{0%{transform:scale(1);opacity:.75}100%{transform:scale(2.8);opacity:0}}',
        '.leaflet-container{position:relative!important;}',
        '.df-dot{width:13px;height:13px;border-radius:50%;border:2.5px solid #fff;cursor:pointer;transition:transform .12s,box-shadow .12s;}',
        '.df-dot:hover{transform:scale(1.3);}',
        '.lf-save-note{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);z-index:1002;background:rgba(13,146,104,.92);color:#fff;padding:5px 14px;border-radius:20px;font-size:.65rem;font-weight:800;white-space:nowrap;box-shadow:0 3px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .25s;pointer-events:none;}',
        '.lf-save-note.show{opacity:1;}',
        '#lf-loader{display:none;position:absolute;inset:0;background:rgba(235,239,248,.88);backdrop-filter:blur(6px);z-index:800;border-radius:12px;flex-direction:column;align-items:center;justify-content:center;gap:10px;}',
        '.leaflet-overlay-pane svg path[fill="black"]{fill:#7c3aed!important;fill-opacity:.12!important;}',
        '.leaflet-overlay-pane svg path[fill="#000000"]{fill:#7c3aed!important;fill-opacity:.12!important;}',
        '.leaflet-overlay-pane svg path[fill="#000"]{fill:#7c3aed!important;fill-opacity:.12!important;}',
        '.leaflet-draw-tooltip{display:none!important;}',
        '.leaflet-draw-guide-dash{display:none!important;}',
        '.leaflet-tooltip{background:var(--card, #fff)!important;color:var(--text-main, #1e3a5f)!important;border:1px solid rgba(30,111,217,.22)!important;border-radius:7px!important;padding:5px 10px!important;font-size:.67rem!important;font-weight:700!important;box-shadow:0 2px 10px rgba(0,0,0,.1)!important;white-space:nowrap!important;}',
        '.leaflet-tooltip::before,.leaflet-tooltip-top::before,.leaflet-tooltip-bottom::before,.leaflet-tooltip-left::before,.leaflet-tooltip-right::before{display:none!important;border:none!important;background:transparent!important;}',
        '.leaflet-interactive{outline:none!important;}',
        '.leaflet-interactive:focus{outline:none!important;}',
        '.leaflet-overlay-pane svg path:focus{outline:none!important;}',
        'path.leaflet-interactive:focus{stroke:inherit!important;outline:none!important;}',
        /* Touch & performa */
        '#lf-map-div{width:100%;height:100%;min-height:400px;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;}',
        '.leaflet-container{touch-action:none;-webkit-overflow-scrolling:touch;}',
        '.leaflet-map-pane,.leaflet-tile-pane,.leaflet-overlay-pane,.leaflet-marker-pane{touch-action:none;}',
        /* Mobile: tombol draw dan nav lebih mudah dipencet */
        '@media(max-width:768px){.lf-draw-toggle{width:40px;height:40px;font-size:1rem}.lf-nav-toggle{width:36px;height:36px}.lf-nav-btn{width:34px;height:34px}}',
        /* Spinner */
        '.spw{position:relative;width:36px;height:36px}',
        '.spo{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(30,111,217,.15);border-top-color:#1e6fd9;animation:lfSpin .8s linear infinite}',
        '.spi{position:absolute;inset:6px;border-radius:50%;border:2px solid rgba(30,111,217,.1);border-bottom-color:#2563eb;animation:lfSpin .5s linear infinite reverse}',
        '@keyframes lfSpin{to{transform:rotate(360deg)}}',
        /* Mobile: sembunyikan label teks tombol peta agar tidak terpotong */
        '@media(max-width:600px){.peta-btn-lbl{display:none}}',

        /* ── Range Dropdown ── */
        '.peta-range-dd{position:absolute;top:calc(100% + 6px);right:0;z-index:2000;background:var(--card-bg,var(--card,#fff));border:1px solid var(--border,#e2e8f0);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);min-width:170px;overflow:hidden;padding:4px 0;}',
        '.peta-range-opt{display:flex;align-items:center;gap:8px;width:100%;padding:9px 16px;border:none;background:none;font-size:.82rem;font-weight:600;cursor:pointer;color:var(--text-main,var(--text,#1e293b));font-family:var(--font,inherit);text-align:left;transition:background .15s,color .15s;}',
        '.peta-range-opt:hover{background:var(--body-bg,var(--bg,#f1f5f9));}',
        '.peta-range-opt--active{background:rgba(30,111,217,.1)!important;color:#1e6fd9!important;font-weight:700!important;}',
        '.peta-range-ico{color:#1e6fd9;width:16px;flex-shrink:0;}',
        '.peta-range-sep{height:1px;background:var(--border,#e2e8f0);margin:2px 0;}',
        /* Dark mode dropdown */
        'body.dark-mode .peta-range-dd{background:var(--card-bg,#1e293b)!important;border-color:var(--border,rgba(255,255,255,.12))!important;box-shadow:0 8px 32px rgba(0,0,0,.5)!important;}',
        'body.dark-mode .peta-range-opt{color:var(--text-main,#e2e8f0)!important;}',
        'body.dark-mode .peta-range-opt:hover{background:rgba(255,255,255,.07)!important;}',
        'body.dark-mode .peta-range-opt--active{background:rgba(30,111,217,.2)!important;color:#60a5fa!important;}',
        'body.dark-mode .peta-range-ico{color:#60a5fa;}',
        'body.dark-mode .peta-range-sep{background:rgba(255,255,255,.1);}',
        /* Dark mode peta-btn */
        'body.dark-mode .peta-btn{background:var(--card-bg,#1e293b)!important;color:var(--text-main,#e2e8f0)!important;border-color:var(--border,rgba(255,255,255,.12))!important;}',
        'body.dark-mode .peta-btn:hover{background:rgba(255,255,255,.08)!important;}',
        'body.dark-mode .peta-btn-primary{background:linear-gradient(135deg,#1e6fd9,#2563eb)!important;color:#fff!important;border-color:transparent!important;}',
        'body.dark-mode .peta-btn-primary:hover{background:linear-gradient(135deg,#1d4ed8,#1e40af)!important;}',
        /* Dark mode topbar peta */
        'body.dark-mode #peta-main-wrap > div:first-child{background:var(--card-bg,#161b22);}',
        /* Dark mode sidebar agenda */
        'body.dark-mode #peta-ag-sidebar{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.1))!important;}',
        'body.dark-mode #peta-ag-sidebar > div:first-child{background:var(--body-bg,#0d1117)!important;}',
        'body.dark-mode #peta-ag-sidebar > div:last-child{background:var(--body-bg,#0d1117)!important;}',
        'body.dark-mode .peta-ag-card{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.1))!important;}',
        'body.dark-mode .peta-ag-card:hover{background:rgba(30,111,217,.1)!important;}',
        /* Dark mode leaflet container */
        'body.dark-mode #leaflet-wrap{border-color:var(--border,rgba(255,255,255,.1))!important;}',
        'body.dark-mode #lf-loader{background:rgba(13,17,23,.88)!important;}',
        /* Dark mode draw panel */
        'body.dark-mode .lf-draw-panel{background:var(--card-bg,#1e293b)!important;border-color:var(--border,rgba(255,255,255,.12))!important;}',
        'body.dark-mode .lf-draw-item{color:var(--text-main,#e2e8f0)!important;}',
        'body.dark-mode .lf-draw-item:hover{background:rgba(255,255,255,.07)!important;}',
        'body.dark-mode .lf-meta-overlay{background:var(--card-bg,#1e293b)!important;border-color:var(--border,rgba(255,255,255,.12))!important;}',
        'body.dark-mode .lf-meta-input{background:var(--body-bg,#0d1117)!important;border-color:var(--border,rgba(255,255,255,.12))!important;color:var(--text-main,#e2e8f0)!important;}',
        /* Dark mode nav control */
        'body.dark-mode .lf-nav-toggle,body.dark-mode .lf-nav-btn{background:var(--card-bg,#1e293b)!important;color:var(--text-main,#e2e8f0)!important;border-color:var(--border,rgba(255,255,255,.12))!important;}',
        'body.dark-mode .lf-draw-toggle{background:var(--card-bg,#1e293b)!important;color:var(--text-main,#e2e8f0)!important;border-color:var(--border,rgba(255,255,255,.12))!important;}',
        /* Dark mode attribution */
        'body.dark-mode .leaflet-control-attribution{background:rgba(13,17,23,.75)!important;color:var(--text-muted,#848d97)!important;}',
        'body.dark-mode .leaflet-control-attribution a{color:#60a5fa!important;}',
        /* Dark mode scale */
        'body.dark-mode .leaflet-control-scale-line{background:rgba(13,17,23,.75)!important;border-color:var(--text-muted,#848d97)!important;color:var(--text-main,#e2e8f0)!important;}',

        /* ── Nav Control ── */
        '.lf-nav-wrap{position:absolute;top:10px;left:10px;z-index:900;display:flex;flex-direction:column;align-items:center;gap:0}',
        '.lf-nav-toggle{width:32px;height:32px;border-radius:8px;background:var(--card,#fff);color:var(--text-main,#1e293b);border:1px solid var(--border,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:.82rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.1);transition:background .14s,color .14s,border-color .14s;flex-shrink:0;-webkit-tap-highlight-color:transparent}',
        '.lf-nav-toggle:hover,.lf-nav-toggle.open{background:#1e6fd9;color:#fff;border-color:#1e6fd9}',
        '.lf-nav-panel{display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;max-height:0;opacity:0;transition:max-height .22s ease,opacity .18s ease;margin-top:3px}',
        '.lf-nav-panel.open{max-height:220px;opacity:1}',
        '.lf-nav-btn{width:30px;height:30px;border-radius:6px;background:var(--card,#fff);color:var(--text-main,#1e293b);border:1px solid var(--border,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:.72rem;cursor:pointer;transition:background .12s,color .12s,border-color .12s;flex-shrink:0;-webkit-tap-highlight-color:transparent;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
        '.lf-nav-btn:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9}',
        '.lf-nav-row{display:flex;gap:2px}',
        '.lf-nav-sep{height:1px;width:30px;background:var(--border,#e2e8f0);margin:2px 0}',

        /* ── Sidebar Agenda Peta ── */
        '#peta-map-area{flex:1;min-height:0;display:flex;flex-direction:row;gap:6px;padding:6px 14px 10px;overflow:hidden;position:relative}',
        '#peta-ag-sidebar{width:240px;min-width:240px;flex-shrink:0;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;transition:min-width .28s cubic-bezier(.4,0,.2,1),width .28s cubic-bezier(.4,0,.2,1),opacity .22s;z-index:5;box-shadow:0 2px 10px rgba(0,0,0,.06)}',
        '#peta-ag-sidebar.sb-collapsed{width:0!important;min-width:0!important;opacity:0!important;pointer-events:none!important;border-width:0!important}',
        '#peta-ag-sb-toggle{flex-shrink:0;width:14px;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.5rem;color:var(--text-muted,#64748b);box-shadow:0 1px 4px rgba(0,0,0,.06);transition:background .16s,color .16s,border-color .16s;padding:0;align-self:stretch;-webkit-tap-highlight-color:transparent}',
        '#peta-ag-sb-toggle:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9}',
        '#peta-ag-sb-toggle.sb-open{background:var(--body-bg,#f1f5f9);color:var(--text-muted,#64748b);border-color:var(--border,#e2e8f0)}',
        '#peta-leaflet-outer{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}',
        '#peta-ag-list{flex:1;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:5px}',
        '#peta-ag-list::-webkit-scrollbar{width:3px}',
        '#peta-ag-list::-webkit-scrollbar-thumb{background:var(--border,#e2e8f0);border-radius:2px}',
        '.peta-ag-card{padding:8px 10px;border-radius:8px;border:1px solid var(--border,#e2e8f0);background:var(--card,#fff);cursor:pointer;transition:all .15s;-webkit-tap-highlight-color:transparent}',
        '.peta-ag-card:hover{border-color:#1e6fd9;background:rgba(30,111,217,.04)}',

        /* Mobile: sidebar overlay persis seperti peta-protokol */
        '@media(max-width:768px){' +
          '#peta-ag-sidebar{position:absolute;left:0;top:0;bottom:0;z-index:1200;border-radius:0 12px 12px 0;box-shadow:4px 0 24px rgba(0,0,0,.18);transform:translateX(-105%);transition:transform .28s cubic-bezier(.4,0,.2,1);opacity:1;width:230px!important;min-width:230px!important}' +
          '#peta-ag-sidebar.sb-mobile-open{transform:translateX(0)}' +
          '#peta-ag-sidebar.sb-collapsed{transform:translateX(-105%)!important}' +
          '#peta-ag-sb-toggle{display:none!important}' +
          '#peta-sb-mobile-btn{display:flex!important}' +
          '#peta-ag-sb-close{display:flex!important}' +
          '#peta-map-area{padding:6px 8px 8px}' +
        '}',

        /* Fullscreen */
        '.peta-fs-active #peta-map-area{padding:6px 8px 8px}',

        /* ── Dark mode fullscreen — topbar, sidebar, controls ── */
        'body.dark-mode .peta-fs-active{background:var(--body-bg,#0d1117)!important}',
        'body.dark-mode .peta-fs-active #peta-main-wrap > div:first-child{background:var(--card-bg,#161b22)!important;border-bottom:1px solid var(--border,rgba(255,255,255,.08))!important}',
        'body.dark-mode .peta-fs-active .peta-btn{background:var(--card-bg,#161b22)!important;color:var(--text-main,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .peta-btn:hover{background:rgba(255,255,255,.08)!important}',
        'body.dark-mode .peta-fs-active .peta-btn-primary{background:linear-gradient(135deg,#1e6fd9,#2563eb)!important;color:#fff!important;border-color:transparent!important}',
        'body.dark-mode .peta-fs-active #peta-ag-sidebar{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.08))!important}',
        'body.dark-mode .peta-fs-active #peta-ag-sidebar > div:first-child{background:var(--body-bg,#0d1117)!important;border-color:var(--border,rgba(255,255,255,.08))!important}',
        'body.dark-mode .peta-fs-active #peta-ag-sidebar > div:last-child{background:var(--body-bg,#0d1117)!important;border-color:var(--border,rgba(255,255,255,.08))!important}',
        'body.dark-mode .peta-fs-active .peta-ag-card{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.08))!important}',
        'body.dark-mode .peta-fs-active #peta-ag-sb-toggle{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.08))!important;color:var(--text-muted,#848d97)!important}',
        'body.dark-mode .peta-fs-active #peta-ag-sb-toggle:hover{background:#1e6fd9!important;color:#fff!important;border-color:#1e6fd9!important}',
        'body.dark-mode .peta-fs-active #leaflet-wrap{border-color:var(--border,rgba(255,255,255,.08))!important}',
        'body.dark-mode .peta-fs-active #lf-loader{background:rgba(13,17,23,.9)!important}',
        'body.dark-mode .peta-fs-active .lf-draw-toggle{background:var(--card-bg,#161b22)!important;color:var(--text-main,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .lf-draw-panel{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .lf-draw-item{color:var(--text-main,#e6edf3)!important}',
        'body.dark-mode .peta-fs-active .lf-draw-item:hover{background:rgba(255,255,255,.07)!important}',
        'body.dark-mode .peta-fs-active .lf-meta-overlay{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .lf-meta-input{background:var(--body-bg,#0d1117)!important;border-color:var(--border,rgba(255,255,255,.12))!important;color:var(--text-main,#e6edf3)!important}',
        'body.dark-mode .peta-fs-active .lf-nav-wrap .lf-nav-toggle,body.dark-mode .peta-fs-active .lf-nav-wrap .lf-nav-btn{background:var(--card-bg,#161b22)!important;color:var(--text-main,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .lf-nav-wrap .lf-nav-toggle:hover,body.dark-mode .peta-fs-active .lf-nav-wrap .lf-nav-btn:hover{background:#1e6fd9!important;color:#fff!important;border-color:#1e6fd9!important}',
        'body.dark-mode .peta-fs-active .peta-range-dd{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .peta-range-opt{color:var(--text-main,#e6edf3)!important}',
        'body.dark-mode .peta-fs-active .peta-range-opt:hover{background:rgba(255,255,255,.07)!important}',
        'body.dark-mode .peta-fs-active .peta-range-opt--active{background:rgba(30,111,217,.2)!important;color:#60a5fa!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-layers{background:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.1))!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-layers-toggle{background-color:var(--card-bg,#161b22)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-layers-toggle::after{color:var(--text-main,#e6edf3)}',
        'body.dark-mode .peta-fs-active .leaflet-control-layers-base label{color:var(--text-main,#e6edf3)!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-layers-base label:hover{background:rgba(255,255,255,.07)!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-zoom-in,body.dark-mode .peta-fs-active .leaflet-control-zoom-out{background:var(--card-bg,#161b22)!important;color:var(--text-main,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-attribution{background:rgba(13,17,23,.75)!important;color:var(--text-muted,#848d97)!important}',
        'body.dark-mode .peta-fs-active .leaflet-control-scale-line{background:rgba(13,17,23,.75)!important;border-color:var(--text-muted,#848d97)!important;color:var(--text-main,#e6edf3)!important}',

        /* ── Leaflet Layer Control (OSM/Satelit/dll) ── */
        '.leaflet-control-layers{background:var(--card,#fff)!important;border:1px solid var(--border,#e2e8f0)!important;border-radius:10px!important;box-shadow:0 3px 14px rgba(0,0,0,.12)!important;font-family:var(--font,"Inter",system-ui,sans-serif)!important;font-size:.72rem!important;min-width:0!important}',
        '.leaflet-control-layers-toggle{width:32px!important;height:32px!important;background-color:var(--card,#fff)!important;background-image:none!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:8px!important;border:1px solid var(--border,#e2e8f0)!important;box-shadow:0 2px 8px rgba(0,0,0,.1)!important;transition:all .16s!important;cursor:pointer!important}',
        '.leaflet-control-layers-toggle::after{content:"\\f5aa";font-family:"Font Awesome 6 Free";font-weight:900;font-size:.82rem;color:var(--text-main,#1e293b)}',
        '.leaflet-control-layers-toggle:hover{background:var(--primary,#1e6fd9)!important;border-color:var(--primary,#1e6fd9)!important}',
        '.leaflet-control-layers-toggle:hover::after{color:#fff}',
        '.leaflet-control-layers-expanded{padding:8px 10px!important;min-width:140px!important}',
        '.leaflet-control-layers-expanded .leaflet-control-layers-toggle{display:none!important}',
        '.leaflet-control-layers-list{margin:0!important}',
        '.leaflet-control-layers-base label,.leaflet-control-layers-overlays label{display:flex!important;align-items:center!important;gap:7px!important;padding:5px 6px!important;border-radius:7px!important;cursor:pointer!important;transition:background .13s!important;color:var(--text-main,#1e293b)!important;font-size:.72rem!important;font-weight:600!important;white-space:nowrap!important;margin:1px 0!important}',
        '.leaflet-control-layers-base label:hover,.leaflet-control-layers-overlays label:hover{background:var(--body-bg,#f1f5f9)!important}',
        '.leaflet-control-layers-base label input,.leaflet-control-layers-overlays label input{width:14px!important;height:14px!important;accent-color:var(--primary,#1e6fd9)!important;flex-shrink:0!important;cursor:pointer!important}',
        '.leaflet-control-layers-separator{border-top:1px solid var(--border,#e2e8f0)!important;margin:4px 0!important}',
        /* Dark mode layer control */
        'body.dark-mode .leaflet-control-layers{background:var(--card-bg,#1e293b)!important;border-color:var(--border,rgba(255,255,255,.1))!important;box-shadow:0 4px 20px rgba(0,0,0,.4)!important}',
        'body.dark-mode .leaflet-control-layers-toggle{background-color:var(--card-bg,#1e293b)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark-mode .leaflet-control-layers-toggle::after{color:var(--text-main,#e2e8f0)}',
        'body.dark-mode .leaflet-control-layers-base label,body.dark-mode .leaflet-control-layers-overlays label{color:var(--text-main,#e2e8f0)!important}',
        'body.dark-mode .leaflet-control-layers-base label:hover,body.dark-mode .leaflet-control-layers-overlays label:hover{background:rgba(255,255,255,.07)!important}',
        'body.dark-mode .leaflet-control-layers-separator{border-color:rgba(255,255,255,.1)!important}',
        /* Ukuran tombol zoom seukuran tombol lain */
        '.leaflet-control-zoom{border:none!important;box-shadow:none!important}',
        '.leaflet-control-zoom-in,.leaflet-control-zoom-out{width:32px!important;height:32px!important;line-height:32px!important;background:var(--card,#fff)!important;color:var(--text-main,#1e293b)!important;border:1px solid var(--border,#e2e8f0)!important;border-radius:8px!important;box-shadow:0 2px 8px rgba(0,0,0,.1)!important;font-size:.9rem!important;font-weight:700!important;transition:all .16s!important;display:flex!important;align-items:center!important;justify-content:center!important;margin-bottom:3px!important}',
        '.leaflet-control-zoom-in:hover,.leaflet-control-zoom-out:hover{background:#1e6fd9!important;color:#fff!important;border-color:#1e6fd9!important}',
        'body.dark-mode .leaflet-control-zoom-in,body.dark-mode .leaflet-control-zoom-out{background:var(--card-bg,#1e293b)!important;color:var(--text-main,#e2e8f0)!important;border-color:var(--border,rgba(255,255,255,.12))!important}'
    ].join('');
    document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
//  7. MANAJEMEN SIKLUS HIDUP LEAFLET
// ─────────────────────────────────────────────────────────────────────────────
function _destroyLeaflet() {
    _cancelPickCoord();
    if (_activeDrawHandler) { try { _activeDrawHandler.disable(); } catch (e) { } _activeDrawHandler = null; }
    if (_lfMap) { try { _lfMap.off(); _lfMap.remove(); } catch (e) { } _lfMap = null; }
    _lfMarkersLP = []; _lfMarkersDF = []; _lfLayerGroupDF = null;
    _drawnItems = null; _drawControl = null; _activeDrawMode = null;
    _drawPanelOpen = false; _drawnMeta = {}; _pendingLayer = null; _pendingLayerType = null;
    _currentBaseLayer = null; _lfTileLayers = {}; _userPickedTileLayer = false;
    _petaFilterMode = 'today';
    _agendaSidebarCollapsed = false;
    window.removeEventListener('resize', _checkAgendaSidebarLayout);}

// ─────────────────────────────────────────────────────────────────────────────
//  8. MEMBANGUN UI PETA UTAMA
// ─────────────────────────────────────────────────────────────────────────────
function loadPeta() {
    _injectPetaStyles(); _destroyLeaflet();
    document.removeEventListener('keydown', _onKeyEsc);

    var h = '<div class="fu peta-container" id="peta-main-wrap" style="padding:0!important;position:relative;display:flex;flex-direction:column;flex:1;height:100%;">'

        /* ── Topbar ── */
        + '<div style="padding:10px 14px 0;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'
        + '<div class="peta-mode-toggle">'
        + '<div style="font-size:1.1rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px">'
        + '<i class="bi bi-geo-alt-fill" style="color:#1e6fd9"></i> Peta Agenda Interaktif'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap;position:relative">'

        /* Tombol toggle sidebar (mobile) */
        + '<button class="peta-btn" id="peta-sb-mobile-btn" onclick="_toggleAgendaSidebarMobile()" title="Daftar Agenda" style="display:none"><i class="bi bi-list-ul"></i></button>'

        /* Date filter */
        + '<div class="peta-btn peta-date-filter-wrap" style="padding:6px 12px;cursor:pointer;position:relative" title="Pilih tanggal spesifik" onclick="_openDatePicker()">'
        + '<i class="bi bi-calendar-event" style="color:#1e6fd9"></i> '
        + '<span id="peta-date-display" style="font-size:.8rem;font-weight:700">Tanggal</span>'
        + '<input type="date" id="peta-date-filter" onchange="_onDateChange(this)" style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px">'
        + '</div>'

        /* Range dropdown */
        + '<div style="position:relative;display:inline-block">'
        + '<button class="peta-btn peta-range-btn" id="btn-peta-bulan" onclick="_togglePetaRangeDropdown(event)" title="Pilih rentang waktu" style="font-size:.75rem"><i class="bi bi-calendar-range"></i> <span id="peta-range-label">Hari Ini</span> <i class="bi bi-chevron-down" style="font-size:.6rem;margin-left:2px"></i></button>'
        + '<div id="peta-range-dropdown" class="peta-range-dd" style="display:none">'
        + '<button class="peta-range-opt peta-range-opt--active" id="peta-opt-today" onclick="_setPetaRange(\'today\')"><i class="bi bi-calendar-check peta-range-ico"></i> Hari Ini</button>'
        + '<button class="peta-range-opt" id="peta-opt-week" onclick="_setPetaRange(\'week\')"><i class="bi bi-calendar-week peta-range-ico"></i> 1 Minggu</button>'
        + '<button class="peta-range-opt" id="peta-opt-month" onclick="_setPetaRange(\'month\')"><i class="bi bi-calendar-month peta-range-ico"></i> 1 Bulan</button>'
        + '<div class="peta-range-sep"></div>'
        + '<button class="peta-range-opt" id="peta-opt-all" onclick="_setPetaRange(\'all\')"><i class="bi bi-calendar3 peta-range-ico"></i> Semua</button>'
        + '</div>'
        + '</div>'

        + '<button class="peta-btn" id="btn-fullscreen" onclick="togglePetaFullscreen()"><i class="bi bi-arrows-fullscreen" id="btn-fs-ico"></i><span class="peta-btn-lbl" id="btn-fs-lbl"> Layar Penuh</span></button>'
        + '<button class="peta-btn peta-btn-primary" onclick="reloadPetaActive()" title="Refresh"><i class="bi bi-arrow-clockwise"></i><span class="peta-btn-lbl"> Refresh</span></button>'
        + '</div>'
        + '</div>'

        /* ── Map + Sidebar area ── */
        + '<div id="peta-map-area">'

        /* Sidebar agenda */
        + '<div id="peta-ag-sidebar">'
        + '<div style="padding:8px 12px;border-bottom:1px solid var(--border,#e2e8f0);flex-shrink:0;display:flex;align-items:center;gap:6px;background:var(--body-bg,#f8fafc)">'
        + '<i class="bi bi-list-ul" style="color:#1e6fd9;font-size:.85rem"></i>'
        + '<span style="font-size:.75rem;font-weight:800;color:var(--text-main,#1e293b);flex:1">Daftar Agenda</span>'
        + '<span id="peta-ag-count" style="font-size:.62rem;color:var(--text-muted,#64748b);font-family:var(--mono,monospace)">0</span>'
        + '<button onclick="_toggleAgendaSidebarMobile()" id="peta-ag-sb-close" style="display:none;width:24px;height:24px;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem"><i class="bi bi-x"></i></button>'
        + '</div>'
        + '<div id="peta-ag-list">'
        + '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:.75rem"><i class="fas fa-spinner fa-spin"></i></div>'
        + '</div>'
        /* Legend di bawah sidebar */
        + '<div style="padding:6px 10px;border-top:1px solid var(--border,#e2e8f0);flex-shrink:0;background:var(--body-bg,#f8fafc)">'
        + '<div style="font-size:.55rem;font-weight:800;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Keterangan</div>'
        + '<div style="display:flex;flex-direction:column;gap:3px">' + _buildLegendHtml() + '</div>'
        + '</div>'
        + '</div>'

        /* Toggle strip sidebar */
        + '<button id="peta-ag-sb-toggle" class="sb-open" onclick="_toggleAgendaSidebar()" title="Sembunyikan/Tampilkan Daftar">'
        + '<i class="bi bi-chevron-left" id="peta-ag-sb-toggle-ico"></i>'
        + '</button>'

        /* Leaflet outer */
        + '<div id="peta-leaflet-outer">'
        + '<div id="leaflet-wrap" style="flex:1;min-height:400px;border-radius:12px;overflow:hidden;border:1px solid var(--border);box-shadow:var(--sh);position:relative">'
        + '<div id="lf-map-div" style="width:100%;height:100%;min-height:400px"></div>'
        + '<div id="lf-loader" style="display:none;position:absolute;inset:0;background:rgba(235,239,248,.88);backdrop-filter:blur(6px);z-index:800;border-radius:12px;flex-direction:column;align-items:center;justify-content:center;gap:10px">'
        + '<div class="spw"><div class="spo"></div><div class="spi"></div></div>'
        + '<span style="font-size:.72rem;font-weight:700;color:var(--mid)">Memuat data peta...</span>'
        + '</div>'
        + '<button class="lf-draw-toggle" id="btn-draw-toggle" onclick="toggleDrawPanel()" title="Gambar & Ukur"><i class="fas fa-pen-ruler"></i></button>'
        + '<div class="lf-draw-panel hidden" id="lf-draw-panel">'
        + '<div class="lf-draw-panel-lbl">Gambar</div>'
        + '<button class="lf-draw-item" id="btn-draw-line" onclick="startDraw(\'polyline\')"><i class="fas fa-pen-nib" style="color:#1e6fd9"></i> Garis / Rute</button>'
        + '<button class="lf-draw-item" id="btn-draw-area" onclick="startDraw(\'polygon\')"><i class="fas fa-vector-square" style="color:#7c3aed"></i> Area / Zona</button>'
        + '<div class="lf-draw-sep"></div>'
        + '<div class="lf-draw-panel-lbl">Kelola</div>'
        + '<button class="lf-draw-item" id="btn-draw-save" onclick="saveDrawings()"><i class="fas fa-floppy-disk" style="color:#0d9268"></i> Simpan</button>'
        + '<button class="lf-draw-item" onclick="loadDrawings()"><i class="fas fa-download" style="color:#d97706"></i> Muat</button>'
        + '<button class="lf-draw-item danger" onclick="clearDrawings()"><i class="fas fa-eraser" style="color:#c0392b"></i> Hapus Semua</button>'
        + '</div>'
        + '<div class="lf-meta-overlay" id="lf-meta-overlay">'
        + '<div class="lf-meta-title" id="lf-meta-title"><i class="fas fa-pen-nib"></i> Tambah Detail Gambar</div>'
        + '<div class="lf-meta-msr" id="lf-meta-msr" style="display:none"><i class="fas fa-ruler"></i><span id="lf-meta-msr-text"></span></div>'
        + '<div class="lf-meta-row">'
        + '<div><label style="font-size:.58rem;font-weight:700;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Nama <span style="color:#c0392b">*</span></label><input class="lf-meta-input" id="lf-meta-nama" placeholder="Nama garis / area..." maxlength="80"></div>'
        + '<div><label style="font-size:.58rem;font-weight:700;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Keterangan</label><input class="lf-meta-input" id="lf-meta-ket" placeholder="Deskripsi singkat..." maxlength="120"></div>'
        + '</div>'
        + '<label style="font-size:.58rem;font-weight:700;color:var(--text-muted,#64748b);display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Warna</label>'
        + '<div class="lf-meta-warna-grid" id="lf-meta-warna-grid"></div>'
        + '<div class="lf-meta-color-custom"><input type="color" class="lf-meta-color-inp" id="lf-meta-color-inp" value="#1e6fd9" oninput="metaWarnaCustom(this.value)"><span class="lf-meta-color-lbl" id="lf-meta-color-lbl">#1e6fd9</span></div>'
        + '<div class="lf-meta-actions"><button class="lf-meta-btn-ok" onclick="confirmDrawMeta()"><i class="fas fa-check"></i> Tambahkan ke Peta</button><button class="lf-meta-btn-cancel" onclick="cancelDrawMeta()">Batal</button></div>'
        + '</div>'
        + '<div class="lf-save-note" id="lf-save-note">Disimpan!</div>'
        + '</div>'
        + '</div>'  /* leaflet-wrap */
        + '</div>'  /* peta-leaflet-outer */
        + '</div>'  /* peta-map-area */

        /* Spacer bawah */
        + '<div style="height:8px;flex-shrink:0"></div>'
        + '</div>';

    var root = document.getElementById('peta-agenda-root');
    if (root) root.innerHTML = h;
    _buildMetaSwatches();
    document.addEventListener('keydown', _onKeyEsc);

    // Set label tanggal awal dengan tanggal aktual hari ini
    var initLabel = _buildDateLabelPA('today');
    var initDisplay = G('peta-date-display');
    var initRangeLabel = G('peta-range-label');
    if (initDisplay) initDisplay.textContent = initLabel;
    if (initRangeLabel) initRangeLabel.textContent = initLabel;

    // Responsive: cek lebar layar
    _checkAgendaSidebarLayout();
    window.removeEventListener('resize', _checkAgendaSidebarLayout);
    window.addEventListener('resize', _checkAgendaSidebarLayout);

    _initLeaflet();
}

function _buildLegendHtml() {
    return SIMBOL_DEF.map(function (it) {
        return '<div style="display:flex;align-items:center;gap:5px;font-size:.65rem;font-weight:600;color:var(--text-main,#1e293b)">'
            + '<i class="fas ' + it.ico + '" style="color:' + it.warna + ';font-size:.65rem;width:12px;text-align:center"></i>'
            + it.label + '</div>';
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
//  11. FITUR PENGUKURAN PADA GAMBAR (MEASURE)
// ─────────────────────────────────────────────────────────────────────────────

function _calcLen(layer) {
    var ll = layer.getLatLngs ? layer.getLatLngs() : [];
    if (Array.isArray(ll[0])) ll = ll[0];
    var t = 0;
    for (var i = 0; i < ll.length - 1; i++) t += ll[i].distanceTo(ll[i + 1]);
    return t;
}

function _calcArea(layer) {
    var ll = layer.getLatLngs ? layer.getLatLngs() : [];
    if (Array.isArray(ll[0])) ll = ll[0];
    if (ll.length < 3) return 0;
    var R = 6371000, n = ll.length, a = 0;
    for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;
        a += (ll[j].lng - ll[i].lng) * Math.PI / 180 * (2 + Math.sin(ll[i].lat * Math.PI / 180) + Math.sin(ll[j].lat * Math.PI / 180));
    }
    return Math.abs(a * R * R / 2);
}

function _fmtLen(m) { return m < 1000 ? m.toFixed(0) + ' m' : (m / 1000).toFixed(2) + ' km'; }
function _fmtArea(m2) { return m2 < 10000 ? m2.toFixed(0) + ' m²' : (m2 / 10000).toFixed(3) + ' ha'; }

function _getMsr(layer, tipe) {
    try { return tipe === 'polyline' ? '📏 ' + _fmtLen(_calcLen(layer)) : '📐 ' + _fmtArea(_calcArea(layer)); }
    catch (e) { return ''; }
}

function _bindMsrTooltip(layer, tipe) {
    var msr = _getMsr(layer, tipe); if (!msr) return;
    layer.bindTooltip('<b>' + msr + '</b>', { permanent: false, sticky: true, direction: 'top', offset: [0, -8], className: 'lf-tip-clean', opacity: 1 });
}

// ─────────────────────────────────────────────────────────────────────────────
//  12. FITUR PICK KOORDINAT MANUAL
// ─────────────────────────────────────────────────────────────────────────────

function _cancelPickCoord() {
    _pickCoordMode = false;
    var md = G('lf-map-div'); if (md) md.classList.remove('lf-pick-cursor');
    var b = G('lf-pick-banner'); if (b && b.parentNode) b.parentNode.removeChild(b);
    if (_lfMap) { _lfMap.off('click'); _lfMap.on('click', function () {}); }
}

function _setPickedCoord(lat, lng) {
    var li = G('lf-lat'), lo = G('lf-lng');
    if (li) { li.value = lat.toFixed(6); li.dispatchEvent(new Event('input')); }
    if (lo) { lo.value = lng.toFixed(6); lo.dispatchEvent(new Event('input')); }
    if (_pickTempMarker && _lfMap) { try { _lfMap.removeLayer(_pickTempMarker); } catch (e) { } }
    _pickTempMarker = L.marker([lat, lng], { icon: L.divIcon({ html: '<div style="width:18px;height:18px;border-radius:50%;background:#0d9268;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.4)"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] }) })
        .addTo(_lfMap).bindPopup('<div class="lf-popup-title"><i class="fas fa-crosshairs" style="color:#0d9268"></i> Koordinat Dipilih</div><div class="lf-popup-row"><span style="font-family:var(--mono);font-size:.63rem">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</span></div>', { maxWidth: 200 }).openPopup();
    toast('Koordinat: ' + lat.toFixed(5) + ', ' + lng.toFixed(5), 'ok');
    setTimeout(function () { if (_pickTempMarker && _lfMap) { try { _lfMap.removeLayer(_pickTempMarker); } catch (e) { } _pickTempMarker = null; } }, 7000);
}

// ─────────────────────────────────────────────────────────────────────────────
//  13. EVENT ESCAPE LISTENER
// ─────────────────────────────────────────────────────────────────────────────
function _onKeyEsc(e) {
    if (e.key !== 'Escape') return;
    if (_pickCoordMode) { _cancelPickCoord(); return; }
    if (G('lf-meta-overlay') && G('lf-meta-overlay').classList.contains('show')) { cancelDrawMeta(); return; }
    if (_drawPanelOpen) { closeDrawPanel(); return; }
    if (_activeDrawMode) { _cancelDraw(); return; }
    if (_petaFullscreen) { togglePetaFullscreen(); }
}

// ─────────────────────────────────────────────────────────────────────────────
//  14. KONTROL PETA (FULLSCREEN, REFRESH)
// ─────────────────────────────────────────────────────────────────────────────
function onPetaFrameLoad() {
    var sh = G('peta-shimmer'), fr = G('peta-frame');
    if (sh) sh.classList.add('hidden');
    if (fr) fr.style.opacity = '1';
}

function _openDatePicker() {
    var input = G('peta-date-filter');
    if (!input) return;
    try {
        input.focus();
        input.click();
        if (input.showPicker) input.showPicker();
    } catch (e) { input.focus(); }
}

// Mode filter peta: 'today' | 'date' | 'week' | 'month' | 'all'
var _petaFilterMode = 'today';

// Helper: format tanggal singkat "Sen, 5 Mei"
function _fmtShortPA(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

// Helper: bangun label tanggal berdasarkan mode
function _buildDateLabelPA(mode) {
    var now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    var today = now.toISOString().split('T')[0];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    if (mode === 'today') {
        return _fmtShortPA(today);
    } else if (mode === 'week') {
        var endW = new Date(now.getTime() + 6 * 86400000);
        var startM = months[now.getMonth()], endM = months[endW.getMonth()];
        if (startM === endM) return now.getDate() + '\u2013' + endW.getDate() + ' ' + endM;
        return now.getDate() + ' ' + startM + '\u2013' + endW.getDate() + ' ' + endM;
    } else if (mode === 'month') {
        var endMo = new Date(now.getTime() + 29 * 86400000);
        return months[now.getMonth()] + '\u2013' + months[endMo.getMonth()];
    } else if (mode === 'all') {
        return 'Semua';
    }
    return _fmtShortPA(today);
}

function _togglePetaRangeDropdown(e) {
    e.stopPropagation();
    var dd = G('peta-range-dropdown');
    if (!dd) return;
    var isOpen = dd.style.display !== 'none';
    dd.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
        // Chiudi al click fuori
        setTimeout(function() {
            document.addEventListener('click', function _closeDD() {
                var d = G('peta-range-dropdown');
                if (d) d.style.display = 'none';
                document.removeEventListener('click', _closeDD);
            });
        }, 10);
    }
}

function _setPetaRange(range) {
    // Tutup dropdown
    var dd = G('peta-range-dropdown');
    if (dd) dd.style.display = 'none';

    // Reset date picker
    var input = G('peta-date-filter');
    if (input) input.value = '';

    var rangeLabel = G('peta-range-label');
    var dateDisplay = G('peta-date-display');

    // Bangun label tanggal aktual
    var actualLabel = _buildDateLabelPA(range);
    if (rangeLabel) rangeLabel.textContent = actualLabel;
    if (dateDisplay) dateDisplay.textContent = actualLabel;

    _petaFilterMode = range;

    // Highlight opsi aktif via CSS class
    ['today','week','month','all'].forEach(function(r) {
        var opt = G('peta-opt-' + r);
        if (opt) {
            opt.classList.toggle('peta-range-opt--active', r === range);
        }
    });

    refreshLeaflet();
}

function _onDateChange(input) {
    var dateDisplay = G('peta-date-display');
    var rangeLabel  = G('peta-range-label');

    // Reset highlight semua opsi dropdown
    ['today','week','month','all'].forEach(function(r) {
        var opt = G('peta-opt-' + r);
        if (opt) opt.classList.remove('peta-range-opt--active');
    });

    if (input.value) {
        _petaFilterMode = 'date';
        var date = new Date(input.value + 'T00:00:00');
        var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        var label = days[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()];
        if (dateDisplay) dateDisplay.textContent = label;
        if (rangeLabel) rangeLabel.textContent = label;
    } else {
        _petaFilterMode = 'today';
        var todayLabel = _buildDateLabelPA('today');
        if (dateDisplay) dateDisplay.textContent = todayLabel;
        if (rangeLabel) rangeLabel.textContent = todayLabel;
        // Highlight "Hari Ini" di dropdown
        var todayOpt = G('peta-opt-today');
        if (todayOpt) todayOpt.classList.add('peta-range-opt--active');
    }
    refreshLeaflet();
}

function togglePetaFullscreen() {
    _petaFullscreen = !_petaFullscreen;
    var wrap    = G('peta-main-wrap');
    var ico     = G('btn-fs-ico');
    var lbl     = G('btn-fs-lbl');
    var sidebar = document.getElementById('sidebar');
    var topbar  = document.getElementById('topbar');

    if (_petaFullscreen) {
        if (wrap) wrap.classList.add('peta-fs-active');
        if (ico) ico.className = 'bi bi-fullscreen-exit';
        if (lbl) lbl.textContent = 'Keluar Penuh';
        if (sidebar) sidebar.style.display = 'none';
        if (topbar)  topbar.style.display  = 'none';
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
    } else {
        if (wrap) wrap.classList.remove('peta-fs-active');
        if (ico) ico.className = 'bi bi-arrows-fullscreen';
        if (lbl) lbl.textContent = 'Layar Penuh';
        if (sidebar) sidebar.style.display = '';
        if (topbar)  topbar.style.display  = '';
        document.body.style.overflow = '';
    }

    if (_lfMap) {
        [50, 300, 600].forEach(function (t) {
            setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, t);
        });
    }
}

function reloadPetaActive() { refreshLeaflet(); }
function _lfShowLoad(m) { var el = G('lf-loader'), sp = el && el.querySelector('span'); if (sp) sp.textContent = m || 'Memuat...'; if (el) el.style.display = 'flex'; }
function _lfHideLoad() { var el = G('lf-loader'); if (el) el.style.display = 'none'; }

// ─────────────────────────────────────────────────────────────────────────────
//  FILE VIEWER INLINE (untuk popup peta)
// ─────────────────────────────────────────────────────────────────────────────
function petaOpenFileViewer(url) {
    if (!url || url === '-' || url === '') { toast('File tidak tersedia.', 'er'); return; }
    // Gunakan openFileViewer dari app.js jika tersedia (halaman admin)
    if (typeof openFileViewer === 'function') { openFileViewer(url, 'Surat/Undangan'); return; }

    // Fallback: buat modal inline sendiri
    var existing = document.getElementById('peta-fv-modal');
    if (existing) existing.remove();

    var urlLower = url.toLowerCase();
    var isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(urlLower);
    var bodyHtml = '';

    // Ekstrak Google Drive file ID
    var driveId = null;
    var m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    var m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m1) driveId = m1[1];
    else if (m2) driveId = m2[1];

    if (isImage) {
        var imgUrl = driveId
            ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1200'
            : url;
        bodyHtml = '<div style="display:flex;align-items:center;justify-content:center;width:100%;max-height:80vh;overflow:auto">'
            + '<img src="' + imgUrl + '" style="max-width:100%;max-height:80vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.4);object-fit:contain" '
            + 'onerror="this.src=\'' + url.replace(/'/g, '%27') + '\'" /></div>';
    } else {
        var viewUrl = driveId
            ? 'https://drive.google.com/file/d/' + driveId + '/preview'
            : 'https://docs.google.com/viewer?embedded=true&url=' + encodeURIComponent(url);
        bodyHtml = '<iframe src="' + viewUrl + '" style="width:min(820px,92vw);height:82vh;border:none;border-radius:8px;background:#fff" allowfullscreen></iframe>';
    }

    var modal = document.createElement('div');
    modal.id = 'peta-fv-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:16px';
    modal.innerHTML = ''
        + '<div style="display:flex;align-items:center;justify-content:space-between;width:min(820px,92vw);gap:12px;flex-shrink:0">'
        +   '<div style="color:#fff;font-weight:700;font-size:.9rem;display:flex;align-items:center;gap:8px">'
        +     '<i class="bi bi-file-earmark-text" style="color:#60a5fa"></i> Surat / Undangan'
        +   '</div>'
        +   '<div style="display:flex;gap:8px">'
        +     '<a href="' + url + '" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(255,255,255,.12);color:#fff;border-radius:8px;font-size:.75rem;font-weight:700;text-decoration:none;border:1px solid rgba(255,255,255,.2);white-space:nowrap">'
        +       '<i class="bi bi-box-arrow-up-right"></i> Buka Tab Baru'
        +     '</a>'
        +     '<button onclick="var m=document.getElementById(\'peta-fv-modal\');if(m)m.remove()" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(225,29,72,.75);color:#fff;border:none;border-radius:8px;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap">'
        +       '<i class="bi bi-x-lg"></i> Tutup'
        +     '</button>'
        +   '</div>'
        + '</div>'
        + bodyHtml;

    // Tutup saat klik backdrop
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
    // Tutup dengan ESC
    var escHandler = function(e) {
        if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(modal);
}

function toggleDrawPanel() {
    _drawPanelOpen = !_drawPanelOpen;
    var p = G('lf-draw-panel'), b = G('btn-draw-toggle');
    if (_drawPanelOpen) { if (p) { p.classList.remove('hidden'); p.classList.add('visible'); } if (b) b.classList.add('active'); }
    else closeDrawPanel();
}

function closeDrawPanel() {
    _drawPanelOpen = false;
    var p = G('lf-draw-panel'), b = G('btn-draw-toggle');
    if (p) { p.classList.remove('visible'); p.classList.add('hidden'); }
    if (b) b.classList.remove('active');
}

// ─────────────────────────────────────────────────────────────────────────────
//  15. INIT LEAFLET PETA UTAMA
// ─────────────────────────────────────────────────────────────────────────────
function _ensureLeafletLoaded(cb) {
    if (window.L && window.L.Draw) { cb(); return; }
    function lC(h, i) { if (document.getElementById(i)) return; var l = document.createElement('link'); l.id = i; l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); }
    function lS(s, fn) { var e = document.createElement('script'); e.src = s; e.onload = fn; document.head.appendChild(e); }
    lC('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'lf-css');
    lC('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css', 'lf-draw-css');
    if (!window.L) lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', function () { lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js', cb); });
    else lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js', cb);
}

function _initLeaflet() {
    _ensureLeafletLoaded(function () {
        var md = G('lf-map-div'); if (!md) return;
        if (_lfMap) {
            if (!document.body.contains(_lfMap.getContainer())) { try { _lfMap.off(); _lfMap.remove(); } catch (e) { } _lfMap = null; }
            else { setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 80); refreshLeaflet(); return; }
        }
        _lfMap = L.map('lf-map-div', {
            center: PETA_CENTER,
            zoom: PETA_ZOOM,
            zoomControl: false,
            attributionControl: true,
            preferCanvas: true,
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true,
            inertia: true,
            inertiaDeceleration: 3000,
            inertiaMaxSpeed: 1500,
            worldCopyJump: true,
            tap: true,
            tapTolerance: 15,
            touchZoom: true,
            bounceAtZoomLimits: true
        });

        var osmL    = L.tileLayer(TILE_LAYERS.osm.url,        { attribution: TILE_LAYERS.osm.attr,        maxZoom: 19, crossOrigin: true });
        var satL    = L.tileLayer(TILE_LAYERS.satellite.url,  { attribution: TILE_LAYERS.satellite.attr,  maxZoom: 19, crossOrigin: true });
        var hybL    = L.tileLayer(TILE_LAYERS.hybrid.url,     { attribution: TILE_LAYERS.hybrid.attr,     maxZoom: 20, crossOrigin: true });
        var gsL     = L.tileLayer(TILE_LAYERS.google_sat.url, { attribution: TILE_LAYERS.google_sat.attr, maxZoom: 20, crossOrigin: true });
        var ctL     = L.tileLayer(TILE_LAYERS.carto.url,      { attribution: TILE_LAYERS.carto.attr,      maxZoom: 19, crossOrigin: true });
        var ctDarkL = L.tileLayer(TILE_LAYERS.carto_dark.url, { attribution: TILE_LAYERS.carto_dark.attr, maxZoom: 19, crossOrigin: true });
        var toL     = L.tileLayer(TILE_LAYERS.topo.url,       { attribution: TILE_LAYERS.topo.attr,       maxZoom: 17, crossOrigin: true });

        // Auto-pilih tile layer sesuai mode gelap/terang
        var _isDark = document.body.classList.contains('dark-mode');
        var _defaultLayer = _isDark ? hybL : osmL;
        _defaultLayer.addTo(_lfMap);
        _currentBaseLayer = _defaultLayer;
        _userPickedTileLayer = false;

        // Simpan referensi layer untuk dark mode switching
        _lfTileLayers = { osm: osmL, carto_dark: ctDarkL, hyb: hybL, sat: satL, gs: gsL, carto: ctL, topo: toL };

        L.control.layers({
            '<i class="fas fa-map" style="color:#1e6fd9"></i> OSM': osmL,
            '<i class="fas fa-road" style="color:#16a34a"></i> Hybrid': hybL,
            '<i class="fas fa-satellite" style="color:#0d9268"></i> Satelit': satL,
            '<i class="fas fa-globe" style="color:#ea580c"></i> G.Sat': gsL,
            '<i class="fas fa-moon" style="color:#818cf8"></i> Dark': ctDarkL,
            '<i class="fas fa-map-location" style="color:#7c3aed"></i> CartoDB': ctL,
            '<i class="fas fa-mountain" style="color:#b45309"></i> Topo': toL
        }, {}, { collapsed: true, position: 'topright' }).addTo(_lfMap);

        _lfMap.on('baselayerchange', function (e) {
            _currentBaseLayer = e.layer;
            _userPickedTileLayer = true; // user memilih manual, jangan auto-switch lagi
        });
        L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(_lfMap);
        _addNavCtrl();

        // ── Dark mode observer: auto-swap tile layer saat tema berubah ──
        if (window.MutationObserver) {
            var _dmObs = new MutationObserver(function(mutations) {
                mutations.forEach(function(m) {
                    if (m.attributeName !== 'class') return;
                    if (_userPickedTileLayer || !_lfMap || !_lfTileLayers.osm) return;
                    var nowDark = document.body.classList.contains('dark-mode');
                    var wantLayer = nowDark ? _lfTileLayers.hyb : _lfTileLayers.osm;
                    var isOsm = _lfMap.hasLayer(_lfTileLayers.osm);
                    var isHyb = _lfMap.hasLayer(_lfTileLayers.hyb);
                    // Hanya swap jika layer saat ini adalah OSM atau Hybrid (bukan satelit/carto/dll)
                    if ((nowDark && isOsm) || (!nowDark && isHyb)) {
                        _lfMap.removeLayer(nowDark ? _lfTileLayers.osm : _lfTileLayers.hyb);
                        wantLayer.addTo(_lfMap);
                        _currentBaseLayer = wantLayer;
                    }
                });
            });
            _dmObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }

        _drawnItems = new L.FeatureGroup().addTo(_lfMap);
        _drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polyline: { shapeOptions: { color: '#1e6fd9', weight: 3, opacity: .9, dashArray: '6 4', fillOpacity: 0 } },
                polygon: { allowIntersection: false, showArea: false, shapeOptions: { color: '#7c3aed', weight: 2.5, opacity: 1, fillColor: '#7c3aed', fillOpacity: .12 } },
                rectangle: false, circle: false, marker: false, circlemarker: false
            },
            edit: { featureGroup: _drawnItems, remove: true }
        });
        _drawControl.addTo(_lfMap);

        _lfMap.on('mousemove', function () {
            if (!_activeDrawMode) return;
            document.querySelectorAll('.leaflet-overlay-pane svg path').forEach(function (p) {
                var f = p.getAttribute('fill');
                if (f === '#000000' || f === 'black' || f === '#000' || (!f && p.style.fill === '')) {
                    p.setAttribute('fill', _activeDrawMode === 'polygon' ? '#7c3aed' : 'none');
                    p.setAttribute('fill-opacity', '0.12');
                }
            });
        });

        setTimeout(function () { var dc = document.querySelector('.leaflet-draw'); if (dc) dc.style.display = 'none'; }, 200);

        _lfMap.on(L.Draw.Event.CREATED, function (e) {
            _showMetaForm(e.layer, _activeDrawMode || (e.layerType === 'polyline' ? 'polyline' : 'polygon'));
            _activeDrawMode = null;
        });
        _lfMap.on(L.Draw.Event.DRAWSTOP, function () { _setDrawMode(null); });
        _lfMap.on('click', function () {});

        _lfLayerGroupDF = L.layerGroup();
        // Hapus pemanggilan _addDefaultMarker() di sini sesuai permintaan agar tidak ada pin.

        // ResizeObserver — invalidate otomatis saat container berubah ukuran
        var _lw = G('leaflet-wrap');
        if (_lw && window.ResizeObserver) {
            var _ro = new ResizeObserver(function () {
                if (_lfMap) _lfMap.invalidateSize({ animate: false });
            });
            _ro.observe(_lw);
        }

        // Window resize fallback
        var _rzTimer;
        window.addEventListener('resize', function () {
            clearTimeout(_rzTimer);
            _rzTimer = setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 180);
        });

        refreshLeaflet();
        loadDrawings();
        [100, 400, 800].forEach(function (t) {
            setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, t);
        });

        // Tutup mobile sidebar saat klik peta
        _lfMap.on('click', function () {
            var sb = G('peta-ag-sidebar');
            if (sb && sb.classList.contains('sb-mobile-open')) {
                _toggleAgendaSidebarMobile();
            }
        });
    });
}

function _addNavCtrl() {
    if (!window.L || !_lfMap) return;
    // CSS sudah diinjeksikan oleh _injectPetaStyles — hapus style lama jika ada
    var oldSt = G('lf-nav-style');
    if (oldSt) oldSt.remove();

    var mapContainer = _lfMap.getContainer();
    // Hapus nav lama jika ada (saat reinit)
    var oldWrap = G('lf-nav-wrap');
    if (oldWrap) oldWrap.remove();

    var wrap = document.createElement('div'); wrap.className = 'lf-nav-wrap'; wrap.id = 'lf-nav-wrap';
    wrap.innerHTML = ''
        + '<button class="lf-nav-toggle" id="lf-nav-toggle" title="Navigasi" onclick="_toggleNavPanel()"><i class="fas fa-compass"></i></button>'
        + '<div class="lf-nav-panel" id="lf-nav-panel">'
        + '<button class="lf-nav-btn" title="Zoom In"  onclick="if(_lfMap)_lfMap.zoomIn()"><i class="fas fa-plus"></i></button>'
        + '<button class="lf-nav-btn" title="Zoom Out" onclick="if(_lfMap)_lfMap.zoomOut()"><i class="fas fa-minus"></i></button>'
        + '<div class="lf-nav-sep"></div>'
        + '<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([0,-80])"><i class="fas fa-chevron-up"></i></button>'
        + '<div class="lf-nav-row">'
        + '<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([-80,0])"><i class="fas fa-chevron-left"></i></button>'
        + '<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([80,0])"><i class="fas fa-chevron-right"></i></button>'
        + '</div>'
        + '<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.panBy([0,80])"><i class="fas fa-chevron-down"></i></button>'
        + '<div class="lf-nav-sep"></div>'
        + '<button class="lf-nav-btn" onclick="if(_lfMap)_lfMap.flyTo(PETA_CENTER,PETA_ZOOM,{animate:true,duration:1.2})" style="color:#f59e0b"><i class="fas fa-crosshairs"></i></button>'
        + '</div>';
    mapContainer.appendChild(wrap);
    L.DomEvent.disableClickPropagation(wrap);
    L.DomEvent.disableScrollPropagation(wrap);
}

function _toggleNavPanel() {
    _navPanelOpen = !_navPanelOpen;
    var panel = G('lf-nav-panel'), toggle = G('lf-nav-toggle');
    if (panel) panel.classList.toggle('open', _navPanelOpen);
    if (toggle) toggle.classList.toggle('open', _navPanelOpen);
}

// ─────────────────────────────────────────────────────────────────────────────
//  16. MENGGAMBAR DAN MENYIMPAN ANOTASI (DRAW)
// ─────────────────────────────────────────────────────────────────────────────
function startDraw(type) {
    if (!_lfMap || !window.L || !L.Draw) { toast('Peta belum siap.', 'er'); return; }
    if (_activeDrawMode === type) { _cancelDraw(); return; }
    _cancelDraw(); _activeDrawMode = type;
    if (type === 'polyline') {
        _activeDrawHandler = new L.Draw.Polyline(_lfMap, { shapeOptions: { color: '#1e6fd9', weight: 3, opacity: .9, dashArray: '6 4', fillOpacity: 0 } });
        toast('Mode GARIS — klik titik, dobel klik selesai', 'inf');
    } else {
        _activeDrawHandler = new L.Draw.Polygon(_lfMap, { allowIntersection: false, showArea: false, shapeOptions: { color: '#7c3aed', weight: 2.5, opacity: 1, fillColor: '#7c3aed', fillOpacity: .12 } });
        toast('Mode AREA — klik titik, dobel klik selesai', 'inf');
    }
    if (_activeDrawHandler) _activeDrawHandler.enable();
    _setDrawMode(type); closeDrawPanel();
}

function _cancelDraw() {
    if (_activeDrawHandler) { _activeDrawHandler.disable(); _activeDrawHandler = null; }
    _activeDrawMode = null; _setDrawMode(null);
}

function _setDrawMode(m) {
    var bl = G('btn-draw-line'), ba = G('btn-draw-area');
    if (bl) bl.classList.toggle('active', m === 'polyline');
    if (ba) ba.classList.toggle('active', m === 'polygon');
}

function clearDrawings() {
    if (!_drawnItems) return;
    var c = Object.keys(_drawnItems._layers || {}).length;
    if (!c) { toast('Tidak ada gambar.', 'inf'); return; }
    _drawnItems.clearLayers(); _drawnMeta = {}; _cancelDraw(); closeDrawPanel();
    toast(c + ' gambar dihapus.', 'ok');
}

function _buildMetaSwatches() {
    var g = G('lf-meta-warna-grid'); if (!g) return;
    g.innerHTML = DRAW_WARNA_PRESET.map(function (c) {
        return '<div class="lf-meta-swatch' + (c.hex === _metaWarna ? ' on' : '') + '" style="background:' + c.hex + '" data-hex="' + c.hex + '" onclick="metaWarnaPilih(\'' + c.hex + '\')"></div>';
    }).join('');
}

function metaWarnaPilih(h) {
    _metaWarna = h;
    document.querySelectorAll('.lf-meta-swatch').forEach(function (s) { s.classList.toggle('on', s.dataset.hex === h); });
    var i = G('lf-meta-color-inp'); if (i) i.value = h;
    var l = G('lf-meta-color-lbl'); if (l) l.textContent = h;
    _applyPC(h);
}

function metaWarnaCustom(h) {
    _metaWarna = h;
    document.querySelectorAll('.lf-meta-swatch').forEach(function (s) { s.classList.remove('on'); });
    var l = G('lf-meta-color-lbl'); if (l) l.textContent = h;
    _applyPC(h);
}

function _applyPC(h) {
    if (!_pendingLayer) return;
    try { if (_pendingLayer.setStyle) _pendingLayer.setStyle(_pendingLayerType === 'polyline' ? { color: h } : { color: h, fillColor: h }); } catch (e) { }
}

function _showMetaForm(layer, type) {
    _pendingLayer = layer; _pendingLayerType = type;
    var dw = type === 'polyline' ? '#1e6fd9' : '#7c3aed';
    _metaWarna = dw; _buildMetaSwatches();
    var inp = G('lf-meta-color-inp'); if (inp) inp.value = dw;
    var lbl = G('lf-meta-color-lbl'); if (lbl) lbl.textContent = dw;
    var n = G('lf-meta-nama'), k = G('lf-meta-ket');
    if (n) n.value = ''; if (k) k.value = '';
    var msr = _getMsr(layer, type);
    var me = G('lf-meta-msr'), mt = G('lf-meta-msr-text');
    if (me) me.style.display = msr ? '' : 'none'; if (mt) mt.textContent = msr;
    var t = G('lf-meta-title');
    if (t) t.innerHTML = '<i class="fas ' + (type === 'polyline' ? 'fa-pen-nib' : 'fa-vector-square') + '"></i> ' + (type === 'polyline' ? 'Detail Garis / Rute' : 'Detail Area / Zona');
    var el = G('lf-meta-overlay'); if (el) el.classList.add('show');
    setTimeout(function () { if (n) n.focus(); }, 260);
}

function confirmDrawMeta() {
    if (!_pendingLayer) return;
    var nama = ((G('lf-meta-nama') || {}).value || '').trim();
    if (!nama) { var n = G('lf-meta-nama'); if (n) { n.focus(); n.style.borderColor = '#c0392b'; } toast('Nama wajib diisi.', 'er'); return; }
    var ket = ((G('lf-meta-ket') || {}).value || '').trim();
    _applyPC(_metaWarna); _drawnItems.addLayer(_pendingLayer);
    var lid = L.Util.stamp(_pendingLayer), msr = _getMsr(_pendingLayer, _pendingLayerType);
    _drawnMeta[lid] = { nama: nama, ket: ket, warna: _metaWarna, tipe: _pendingLayerType, measurement: msr };
    _bindDrawnPopup(_pendingLayer, nama, ket, _metaWarna, _pendingLayerType, msr);
    _bindMsrTooltip(_pendingLayer, _pendingLayerType);
    _hideMetaForm(); _setDrawMode(null);
    toast('Gambar "' + nama + '" ditambahkan.', 'ok');
    _pendingLayer = null; _pendingLayerType = null;
}

function cancelDrawMeta() {
    if (_pendingLayer && _lfMap) { try { _lfMap.removeLayer(_pendingLayer); } catch (e) { } }
    _pendingLayer = null; _pendingLayerType = null;
    _hideMetaForm(); _setDrawMode(null);
    toast('Gambar dibatalkan.', 'inf');
}

function _hideMetaForm() { var el = G('lf-meta-overlay'); if (el) el.classList.remove('show'); }

function _bindDrawnPopup(layer, nama, ket, warna, tipe, msr) {
    var ico = tipe === 'polyline' ? 'fa-pen-nib' : 'fa-vector-square';
    var label = tipe === 'polyline' ? 'Garis / Rute' : 'Area / Zona';
    var html = '<div class="lf-popup-title" style="display:flex;align-items:center;gap:5px">'
        + '<i class="fas ' + ico + '" style="color:' + warna + '"></i>'
        + '<span style="font-weight:800;color:var(--text-main, var(--text, #1e293b))">' + esc(nama) + '</span></div>'
        + '<div class="lf-popup-badge" style="background:' + warna + '18;color:' + warna + ';border:1px solid ' + warna + '30">' + label + '</div>'
        + (msr ? '<div class="lf-popup-row" style="margin-top:4px"><span style="font-family:var(--mono);font-size:.7rem;font-weight:800;color:' + warna + '">' + msr + '</span></div>' : '')
        + (ket ? '<div class="lf-popup-row"><i class="fas fa-info-circle" style="color:var(--text-muted, var(--muted, #64748b))"></i><span>' + esc(ket) + '</span></div>' : '');
    if (layer.bindPopup) layer.bindPopup(html, { maxWidth: 260, className: 'lf-clean-popup' });
}

function _serializeDrawings() {
    var r = []; if (!_drawnItems) return r;
    _drawnItems.eachLayer(function (layer) {
        try {
            var gj = layer.toGeoJSON(), lid = L.Util.stamp(layer), meta = _drawnMeta[lid] || {};
            r.push({ tipe: gj.geometry.type, warna: meta.warna || '#1e6fd9', nama: meta.nama || '', ket: meta.ket || '', measurement: meta.measurement || '', geojson: JSON.stringify(gj) });
        } catch (e) { }
    });
    return r;
}

function saveDrawings() {
    if (!_drawnItems) { toast('Tidak ada gambar.', 'inf'); return; }
    var d = _serializeDrawings();
    if (!d.length) { toast('Tidak ada gambar.', 'inf'); return; }
    var btn = G('btn-draw-save');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    callAPI('saveMapDrawings', { drawings: d }).then(function (res) {
        if (btn) btn.innerHTML = '<i class="fas fa-floppy-disk" style="color:#0d9268"></i> Simpan';
        if (res.success) {
            _showSaveNote('✓ ' + d.length + ' disimpan!');
            toast(d.length + ' gambar disimpan.', 'ok');
            closeDrawPanel();
        } else toast('Gagal.', 'er');
    });
}

function loadDrawings() {
    if (!_lfMap || !_drawnItems) return;

    callAPI('getMapDrawings', {}).then(function (res) {
        if (!res.success || !res.data || !res.data.length) return;
        _drawnItems.clearLayers(); _drawnMeta = {};
        res.data.forEach(function (d) {
            try {
                var gj = JSON.parse(d.geojson), w = d.warna || '#1e6fd9', isLine = gj.geometry && gj.geometry.type === 'LineString';
                var opts = isLine
                    ? { color: w, weight: 3, opacity: .9, dashArray: '6 4' }
                    : { color: w, weight: 2, fillColor: w, fillOpacity: .18, opacity: .9 };
                var lyr = L.geoJSON(gj, { style: opts });
                lyr.eachLayer(function (sub) {
                    _drawnItems.addLayer(sub);
                    var lid = L.Util.stamp(sub), tipe = isLine ? 'polyline' : 'polygon';
                    var msr = d.measurement || _getMsr(sub, tipe);
                    _drawnMeta[lid] = { nama: d.nama || '', ket: d.ket || '', warna: w, tipe: tipe, measurement: msr };
                    if (d.nama) { _bindDrawnPopup(sub, d.nama, d.ket, w, tipe, msr); _bindMsrTooltip(sub, tipe); }
                });
            } catch (e) { }
        });
        toast(res.data.length + ' gambar dimuat.', 'ok');
    });
}

function _showSaveNote(msg) {
    var el = G('lf-save-note'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2800);
}

// ─────────────────────────────────────────────────────────────────────────────
//  17. ICONS DAN MARKER LAYER UTAMA
// ─────────────────────────────────────────────────────────────────────────────
function _makeLeafletIcon(warna, faIco) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><ellipse cx="16" cy="39" rx="5" ry="2.5" fill="rgba(0,0,0,.2)"/><path d="M16 0C9.37 0 4 5.37 4 12c0 9.5 12 28 12 28S28 21.5 28 12C28 5.37 22.63 0 16 0z" fill="' + warna + '"/><circle cx="16" cy="12" r="8" fill="rgba(255,255,255,.22)"/></svg>';
    return L.divIcon({ html: '<div style="position:relative;width:32px;height:42px">' + svg + '<i class="fas ' + faIco + '" style="position:absolute;top:6px;left:50%;transform:translateX(-50%);color:#fff;font-size:9px;pointer-events:none"></i></div>', className: '', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -40] });
}

function _makeDFIcon(warna) {
    var c = warna || '#1e6fd9';
    return L.divIcon({ html: '<div class="df-dot" style="background:' + c + ';box-shadow:0 2px 8px ' + c + '55"></div>', className: '', iconSize: [13, 13], iconAnchor: [6, 6], popupAnchor: [0, -8] });
}

function refreshLeaflet() {
    if (!_lfMap) { _initLeaflet(); return; }
    _lfShowLoad('Memuat data peta...');

    callAPI('getAgenda', {}).then(function (res) {
        _lfHideLoad();
        if (!res.success) {
            toast('Gagal memuat agenda: ' + res.message, 'error');
            return;
        }

        // Filter agenda berdasarkan mode
        var filterEl = document.getElementById('peta-date-filter');
        var selectedDate = filterEl ? filterEl.value : '';
        var today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
        var mode = _petaFilterMode || 'today';

        // Set default hari ini saat pertama load
        if (!selectedDate && mode === 'today') {
            var display = G('peta-date-display');
            if (display && display.textContent === 'Hari Ini') { /* sudah benar */ }
        }

        var data = res.data.filter(function (d) {
            if (!d['Latitude'] || !d['Longitude']) return false;
            if (parseFloat(d['Latitude']) === 0 || parseFloat(d['Longitude']) === 0) return false;

            var agendaDate = (d['Tanggal Pelaksanaan'] || d['Tanggal'] || '').substring(0, 10);

            if (mode === 'today') {
                return agendaDate === today;
            } else if (mode === 'date' && selectedDate) {
                return agendaDate === selectedDate;
            } else if (mode === 'week') {
                var d7 = new Date(Date.now() + 7 * 60 * 60 * 1000);
                d7.setUTCDate(d7.getUTCDate() + 6);
                var end7 = d7.toISOString().split('T')[0];
                return agendaDate >= today && agendaDate <= end7;
            } else if (mode === 'month') {
                var monthStr = today.substring(0, 7);
                return agendaDate.startsWith(monthStr);
            } else if (mode === 'all') {
                return true;
            }
            return agendaDate === today; // fallback
        });

        _layerData = data;
        _renderLeafletLayers(data);
        _precacheSimbolIcons();

        var countEl = document.getElementById('peta-count');
        if (countEl) countEl.textContent = data.length + ' lokasi agenda ditemukan';

    }).catch(function (e) {
        _lfHideLoad();
        toast('Gagal memuat agenda: ' + e.message, 'error');
    });
}

function _renderLeafletLayers(data) {
    _lfMarkersLP.forEach(function (m) { _lfMap.removeLayer(m); }); _lfMarkersLP = [];

    var listEl = document.getElementById('peta-list');
    var sbListEl = document.getElementById('peta-ag-list');
    var sbCountEl = document.getElementById('peta-ag-count');
    var sbHtml = [];

    var formatTgl = typeof fmtDate === 'function' ? fmtDate : function(d) { return d; };
    var safeStr = typeof esc === 'function' ? esc : function(s) { return s; };

    data.forEach(function (d, idx) {
        var lat = parseFloat(d['Latitude']);
        var lng = parseFloat(d['Longitude']);

        var status = d['Status Kehadiran'] || 'Hadir';
        var sd = getSimbolDef(status);
        var warna = sd.warna;
        var ico = sd.ico;

        var cpFormatted = formatWA(safeStr(d['Penanggung Jawab'] || d['CP'] || '-'));
        var tglVal = d['Tanggal Pelaksanaan'] || d['Tanggal'] || '';
        var tglFormatted = tglVal ? formatTgl(tglVal) : '';

        var popup = '<div class="lf-popup-title" style="font-weight:800; font-size:.85rem; line-height:1.4;"><i class="fas ' + ico + '" style="color:' + warna + '"></i> ' + safeStr(d['Nama Kegiatan'] || d['Perihal'] || 'Agenda') + '</div>' +
            '<div class="lf-popup-badge" style="background:' + warna + '22;color:' + warna + '">' + safeStr(status) + '</div>' +
            '<table style="font-size:.8rem;width:100%;border-collapse:collapse;margin-top:8px">' +
            (d['Penyelenggara'] ? '<tr><td style="color:var(--text-muted, #64748b);padding:2px 6px 2px 0;width:35%">Penyelenggara</td><td><strong>' + safeStr(d['Penyelenggara']) + '</strong></td></tr>' : '') +
            (tglFormatted ? '<tr><td style="color:var(--text-muted, #64748b);padding:2px 6px 2px 0">Tanggal</td><td><strong>' + tglFormatted + '</strong></td></tr>' : '') +
            (d['Waktu'] ? '<tr><td style="color:var(--text-muted, #64748b);padding:2px 6px 2px 0">Waktu</td><td>' + safeStr(d['Waktu']) + '</td></tr>' : '') +
            (d['Lokasi'] ? '<tr><td style="color:var(--text-muted, #64748b);padding:2px 6px 2px 0">Lokasi</td><td>' + safeStr(d['Lokasi']) + '</td></tr>' : '') +
            (cpFormatted !== '-' ? '<tr><td style="color:var(--text-muted, #64748b);padding:2px 6px 2px 0">Contact</td><td style="line-height:1.3">' + cpFormatted + '</td></tr>' : '') +
            '</table>';

        if (d['URL'] && d['URL'] !== '-' && d['URL'] !== '') {
            var safeUrl = d['URL'].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            popup += '<button onclick="petaOpenFileViewer(\'' + safeUrl + '\')" style="display:flex;align-items:center;gap:5px;margin-top:8px;padding:6px 10px;background:rgba(30,111,217,.1);color:#1e6fd9;border:1px solid rgba(30,111,217,.25);border-radius:8px;font-size:.74rem;font-weight:700;cursor:pointer;width:100%;justify-content:center"><i class="bi bi-file-earmark-text"></i> Lihat Surat/Undangan</button>';
        }

        popup += '<a href="https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng + '" target="_blank" style="display:block;margin-top:8px;padding:6px;background:var(--primary, #1e6fd9);color:#fff;text-align:center;border-radius:6px;text-decoration:none;font-weight:600;font-size:.8rem"><i class="fas fa-map-marker-alt"></i> Buka di Google Maps</a>' +
            '<div style="margin-top:8px;font-size:.65rem;color:var(--text-muted, #64748b);text-align:right"><i class="fas fa-map-pin"></i> ' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '</div>';

        var m = L.marker([lat, lng], { icon: _makeLeafletIcon(warna, ico) }).addTo(_lfMap).bindPopup(popup, { maxWidth: 280, className: 'lf-clean-popup' });
        m.agendaData = d;
        _lfMarkersLP.push(m);

        // Sidebar card
        var namaKegiatan = safeStr(d['Nama Kegiatan'] || '-');
        var waktuStr = d['Waktu'] ? safeStr(d['Waktu']) : '';
        var lokasiStr = d['Lokasi'] ? safeStr(d['Lokasi']) : '';
        sbHtml.push(
            '<div onclick="focusPetaMarker(' + idx + ')" style="padding:8px 10px;border-radius:8px;border:1px solid var(--border,#e2e8f0);background:var(--card,#fff);cursor:pointer;transition:all .15s;-webkit-tap-highlight-color:transparent" '
            + 'onmouseover="this.style.borderColor=\'' + warna + '\';this.style.background=\'' + warna + '11\'" '
            + 'onmouseout="this.style.borderColor=\'var(--border,#e2e8f0)\';this.style.background=\'var(--card,#fff)\'">'
            + '<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">'
            + '<i class="fas ' + ico + '" style="color:' + warna + ';font-size:.65rem;flex-shrink:0"></i>'
            + '<span style="font-size:.72rem;font-weight:800;color:var(--text-main,#1e293b);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + namaKegiatan + '</span>'
            + '</div>'
            + (tglFormatted ? '<div style="font-size:.65rem;color:var(--text-muted,#64748b);display:flex;align-items:center;gap:4px"><i class="bi bi-calendar3" style="font-size:.6rem"></i>' + tglFormatted + (waktuStr ? ' · ' + waktuStr : '') + '</div>' : '')
            + (lokasiStr ? '<div style="font-size:.65rem;color:var(--text-muted,#64748b);display:flex;align-items:center;gap:4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="bi bi-geo-alt" style="font-size:.6rem;flex-shrink:0"></i>' + lokasiStr + '</div>' : '')
            + '</div>'
        );
    });

    if (_lfMarkersLP.length > 0) {
        var group = L.featureGroup(_lfMarkersLP);
        _lfMap.fitBounds(group.getBounds().pad(0.2));
    }

    // Update sidebar
    if (sbCountEl) sbCountEl.textContent = data.length;
    if (sbListEl) {
        if (data.length === 0) {
            sbListEl.innerHTML = '<div style="padding:20px 10px;text-align:center;color:var(--text-muted,#64748b);font-size:.75rem"><i class="bi bi-geo-alt" style="display:block;font-size:1.5rem;margin-bottom:8px;opacity:.4"></i>Tidak ada agenda dengan koordinat</div>';
        } else {
            sbListEl.innerHTML = sbHtml.join('');
        }
    }

    // Update peta-list jika ada (legacy)
    if (listEl) {
        if (data.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px"><i class="bi bi-geo-alt"></i> Belum ada agenda yang sesuai atau memiliki koordinat.</p>';
        } else {
            listEl.innerHTML = sbHtml.join('');
        }
    }
}

function focusPetaMarker(idx) {
    if (!_lfMarkersLP[idx]) return;
    var latlng = _lfMarkersLP[idx].getLatLng();
    if (_lfMap) {
        _lfMap.setView(latlng, 16, { animate: true });
        _lfMarkersLP[idx].openPopup();
    }
}

function focusAgendaOnMap(agendaId) {
    var attempts = 0;
    var intv = setInterval(function () {
        if (_lfMap && _lfMarkersLP.length > 0) {
            clearInterval(intv);
            var marker = _lfMarkersLP.find(function (m) { return String(m.agendaData && m.agendaData.ID) === String(agendaId); });
            if (marker) {
                _lfMap.setView(marker.getLatLng(), 17, { animate: true });
                marker.openPopup();
            } else {
                toast('Titik lokasi tidak ditemukan di peta.', 'info');
            }
            return;
        }
        attempts++;
        if (attempts > 20) {
            clearInterval(intv); 
            if (!_lfMap) toast('Gagal memuat peta.', 'error');
            else if (_lfMarkersLP.length === 0) toast('Titik lokasi tidak ditemukan (peta kosong).', 'info');
        }
    }, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR AGENDA PETA
// ─────────────────────────────────────────────────────────────────────────────
var _agendaSidebarCollapsed = false;

function _toggleAgendaSidebar() {
    var sb = G('peta-ag-sidebar');
    var toggle = G('peta-ag-sb-toggle');
    var ico = G('peta-ag-sb-toggle-ico');
    if (!sb) return;
    _agendaSidebarCollapsed = !_agendaSidebarCollapsed;
    if (_agendaSidebarCollapsed) {
        sb.classList.add('sb-collapsed');
        if (toggle) { toggle.classList.remove('sb-open'); }
        if (ico) ico.className = 'bi bi-chevron-right';
    } else {
        sb.classList.remove('sb-collapsed');
        if (toggle) { toggle.classList.add('sb-open'); }
        if (ico) ico.className = 'bi bi-chevron-left';
    }
    // Invalidate map setelah animasi selesai
    setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 300);
}

function _toggleAgendaSidebarMobile() {
    var sb = G('peta-ag-sidebar');
    if (!sb) return;
    var isOpen = sb.classList.contains('sb-mobile-open');
    if (isOpen) {
        sb.classList.remove('sb-mobile-open');
        var bd = G('peta-ag-sb-backdrop');
        if (bd) bd.remove();
    } else {
        sb.classList.add('sb-mobile-open');
        sb.classList.remove('sb-collapsed');
        // Tambah backdrop untuk tutup saat klik di luar
        var bd = document.createElement('div');
        bd.id = 'peta-ag-sb-backdrop';
        bd.style.cssText = 'position:absolute;inset:0;z-index:1199;background:rgba(0,0,0,.3)';
        bd.onclick = function() { _toggleAgendaSidebarMobile(); };
        var area = G('peta-map-area');
        if (area) area.appendChild(bd);
    }
}

function _checkAgendaSidebarLayout() {
    var sb = G('peta-ag-sidebar');
    var mobileBtn = G('peta-sb-mobile-btn');
    var closeBtn = G('peta-ag-sb-close');
    if (!sb) return;
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
        if (mobileBtn) mobileBtn.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'flex';
        // Tutup sidebar saat pertama kali atau resize ke mobile
        sb.classList.remove('sb-mobile-open');
        var bd = G('peta-ag-sb-backdrop');
        if (bd) bd.remove();
    } else {
        if (mobileBtn) mobileBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
        // Pastikan sidebar tampil di desktop jika tidak collapsed
        if (!_agendaSidebarCollapsed) {
            sb.classList.remove('sb-collapsed');
        }
        setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 50);
    }
}



