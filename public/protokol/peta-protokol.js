// ══════════════════════════════════════════════════════════════════════════════
//  PETA PROTOKOL — peta-protokol.js
//  Modul Peta Read-Only untuk Halaman PROTOKOL (Role USER)
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  1. HELPER DOM
// ─────────────────────────────────────────────────────────────────────────────
function G(id) { return document.getElementById(id); }

if (typeof callAPI === 'undefined') {
    var callAPI = function (action, payload) {
        var BASE_URL = window.location.origin;
        return fetch(BASE_URL + '/api/' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, payload: payload || {} })
        }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).catch(function (err) {
            console.error('API Error:', err);
            throw err;
        });
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. STATE
// ─────────────────────────────────────────────────────────────────────────────
var _petaFullscreen = false;
var _lfMap = null;
var _lfMarkersLP = [];
var _lfLayerGroupDF = null;
var _layerData = [];
var _navPanelOpen = false;
var _resizeObserver = null;
var _lfRZHandler = null;
var _currentBaseLayer = null;
var _isFirstLoad = true;

// ─────────────────────────────────────────────────────────────────────────────
//  3. KONSTANTA
// ─────────────────────────────────────────────────────────────────────────────
var PETA_CENTER = [-7.870481, 111.462307];
var PETA_ZOOM = 15;

var SIMBOL_DEF = [
    { id: 'Hadir', ico: 'fa-check-circle', label: 'Hadir', warna: '#16a34a' },
    { id: 'Tidak Hadir', ico: 'fa-times-circle', label: 'Tidak Hadir', warna: '#e11d48' },
    { id: 'Disposisi', ico: 'fa-share', label: 'Disposisi', warna: '#b45309' },
    { id: 'Belum Konfirmasi', ico: 'fa-question-circle', label: 'Belum Konfirmasi', warna: '#0891b2' }
];

var TILE_LAYERS = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', label: 'OpenStreetMap', maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Esri', label: 'Satelit Esri', maxZoom: 19 },
    hybrid: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Hybrid', maxZoom: 20 },
    google_sat: { url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Sat', maxZoom: 20 },
    carto: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: 'CartoDB', label: 'CartoDB', maxZoom: 19 },
    topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: 'OpenTopoMap', label: 'Topografi', maxZoom: 17 }
};

// ─────────────────────────────────────────────────────────────────────────────
//  4. UTILITAS
// ─────────────────────────────────────────────────────────────────────────────
function toast(msg, type) {
    var mappedType = 'info';
    if (type === 'ok') mappedType = 'success';
    if (type === 'er' || type === 'error') mappedType = 'error';
    if (typeof showToast === 'function') showToast(msg, mappedType);
}

function getSimbolDef(id) {
    for (var i = 0; i < SIMBOL_DEF.length; i++) {
        if (SIMBOL_DEF[i].id === id) return SIMBOL_DEF[i];
    }
    return SIMBOL_DEF[0];
}

function formatWA(text) {
    if (!text) return '-';
    var phoneRegex = /(\+62|62|0)[0-9 \-\(\)]{8,14}/g;
    var match = text.match(phoneRegex);
    if (match) {
        var numStr = match[0];
        var cleanNum = numStr.replace(/\D/g, '');
        if (cleanNum.startsWith('0')) cleanNum = '62' + cleanNum.substring(1);
        var waLink = '<a href="https://wa.me/' + cleanNum + '" target="_blank" style="display:inline-flex;align-items:center;gap:4px;color:#10b981;font-weight:800;text-decoration:none;background:rgba(16,185,129,.12);padding:2px 8px;border-radius:6px;margin-top:3px;font-size:.72rem"><i class="fab fa-whatsapp"></i> Chat WA (' + numStr.trim() + ')</a>';
        return text.replace(numStr, '<br>' + waLink);
    }
    return text;
}


// ─────────────────────────────────────────────────────────────────────────────
//  5. INJECT CSS
// ─────────────────────────────────────────────────────────────────────────────
function _injectPetaStyles() {
    if (G('peta-dyn-style')) return;
    var s = document.createElement('style');
    s.id = 'peta-dyn-style';
    s.textContent = [
        /* ── Reset ── */
        '*,*::before,*::after{box-sizing:border-box}',

        /* ── Container ── */
        '.peta-container{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--pb,var(--bg,#f1f5f9));font-family:var(--font,"Inter",system-ui,sans-serif);position:relative;overflow:hidden}',

        /* ── Topbar ── */
        '#peta-topbar{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 16px 8px;background:var(--card,#fff);border-bottom:1px solid var(--border,#e2e8f0);box-shadow:0 1px 6px rgba(0,0,0,.04);z-index:1100}',
        '#peta-topbar .peta-brand{display:flex;align-items:center;gap:10px}',
        '#peta-topbar .peta-brand-ico{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#1e6fd9,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.85rem;box-shadow:0 3px 10px rgba(37,99,235,.3);flex-shrink:0}',
        '#peta-topbar .peta-brand-text{font-size:.95rem;font-weight:800;color:var(--text,#1e293b);letter-spacing:-.01em}',
        '#peta-topbar .peta-brand-sub{font-size:.64rem;color:var(--muted,#64748b);font-weight:500;margin-top:1px}',
        '#peta-topbar .peta-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',

        /* ── Tombol ── */
        '.p3-btn{display:inline-flex;align-items:center;gap:6px;padding:0 13px;height:36px;border-radius:9px;font-size:.75rem;font-weight:700;font-family:inherit;border:1px solid var(--border,#e2e8f0);background:var(--card,#fff);color:var(--text,#1e293b);cursor:pointer;transition:all .16s;white-space:nowrap;user-select:none;box-shadow:0 1px 4px rgba(0,0,0,.04);-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
        '.p3-btn:hover{background:var(--bg-hover,#f8fafc);transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.07)}',
        '.p3-btn:active{transform:translateY(0);opacity:0.7}',
        '.p3-btn-primary{background:linear-gradient(135deg,#1e6fd9,#2563eb)!important;color:#fff!important;border:none!important;box-shadow:0 3px 12px rgba(37,99,235,.3)!important}',
        '.p3-btn-primary:hover{background:linear-gradient(135deg,#1d4ed8,#1e40af)!important;box-shadow:0 5px 16px rgba(37,99,235,.4)!important}',
        '.p3-btn-icon{padding:0!important;width:36px;justify-content:center}',

        /* ── Date Pill ── */
        '.p3-date-pill{display:inline-flex;align-items:center;gap:6px;padding:0 12px;height:36px;border-radius:9px;cursor:pointer;border:1px solid var(--border,#e2e8f0);background:var(--card,#fff);font-size:.75rem;font-weight:700;color:var(--text,#1e293b);transition:all .16s;position:relative;box-shadow:0 1px 4px rgba(0,0,0,.04);-webkit-tap-highlight-color:transparent}',
        '.p3-date-pill:hover{border-color:#1e6fd9;box-shadow:0 0 0 3px rgba(37,99,235,.08)}',
        '.p3-date-pill.active{border-color:#1e6fd9;background:rgba(30,111,217,.06);color:#1e6fd9}',
        '.p3-date-pill input[type="date"]{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}',
        '.p3-date-pill .clear-date{width:16px;height:16px;border-radius:50%;background:rgba(100,116,139,.15);color:var(--muted,#64748b);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.5rem;padding:0;transition:all .13s;margin-left:2px}',
        '.p3-date-pill .clear-date:hover{background:#e11d48;color:#fff}',

        /* ── Map Area ── */
        '#peta-map-area{flex:1;min-height:0;display:flex;flex-direction:row;position:relative;overflow:hidden;height:0}',

        /* ── Sidebar ── */
        '#peta-sidebar{width:280px;flex-shrink:0;background:var(--card,#fff);border-right:1px solid var(--border,#e2e8f0);display:flex;flex-direction:column;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1),opacity .25s;z-index:5}',
        '#peta-sidebar.collapsed{width:0!important;opacity:0;pointer-events:none}',
        '#peta-sidebar-header{padding:10px 14px;border-bottom:1px solid var(--border,#e2e8f0);flex-shrink:0;display:flex;align-items:center;gap:8px;background:var(--bg,#f8fafc)}',
        '#peta-sidebar-header .sidebar-title{font-size:.78rem;font-weight:800;color:var(--text,#1e293b);flex:1}',
        '#peta-sidebar-header .sidebar-close{display:none;width:32px;height:32px;align-items:center;justify-content:center;font-size:1.1rem;color:var(--muted);background:transparent;border:none;cursor:pointer;touch-action:manipulation}',
        '#peta-list-wrap{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px}',
        '#peta-list-wrap::-webkit-scrollbar{width:3px}',
        '#peta-list-wrap::-webkit-scrollbar-thumb{background:var(--border,#e2e8f0);border-radius:2px}',
        '.peta-list-card{padding:10px 12px;border-radius:10px;border:1px solid var(--border,#e2e8f0);background:var(--card,#fff);cursor:pointer;transition:all .15s;-webkit-tap-highlight-color:transparent}',
        '.peta-list-card:hover{border-color:#1e6fd9;box-shadow:0 3px 12px rgba(30,111,217,.1);transform:translateX(2px)}',
        '.peta-list-card .card-title{font-size:.8rem;font-weight:800;color:var(--text,#1e293b);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:5px}',
        '.peta-list-card .card-meta{font-size:.68rem;color:var(--muted,#64748b);display:flex;align-items:center;gap:4px;margin-top:2px}',
        '.peta-list-card .card-meta i{width:12px;text-align:center;flex-shrink:0}',
        '.peta-list-card .card-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:.6rem;font-weight:700;margin-bottom:4px}',

        /* ── Leaflet Wrap ── */
        '#leaflet-outer{flex:1;min-width:0;position:relative;display:flex;flex-direction:column;min-height:0}',
        '#leaflet-wrap{flex:1;min-height:400px;border-radius:12px;overflow:hidden;border:1px solid var(--border,#e2e8f0);box-shadow:0 4px 20px rgba(0,0,0,.06);position:relative}',
        '#lf-map-div{width:100%;height:100%;min-height:400px;position:absolute;inset:0}',

        /* ── Sidebar Toggle Strip — flex sibling between sidebar and map ── */
        '#sidebar-toggle{flex-shrink:0;width:14px;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.5rem;color:var(--muted,#64748b);box-shadow:0 1px 4px rgba(0,0,0,.06);transition:background .16s,color .16s,border-color .16s;padding:0;align-self:stretch;-webkit-tap-highlight-color:transparent;z-index:10}',
        '#sidebar-toggle:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9}',
        '#sidebar-toggle.sb-open{background:var(--bg,#f8fafc);color:var(--muted,#64748b);border-color:var(--border,#e2e8f0)}',

        /* ── Legend ── */
        '#peta-legend{flex-shrink:0;padding:8px 12px;border-top:1px solid var(--border,#e2e8f0);background:var(--bg,#f8fafc)}',
        '#peta-legend .leg-title{font-size:.58rem;font-weight:800;color:var(--muted,#64748b);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:flex;align-items:center;gap:5px}',
        '#peta-legend .leg-grid{display:flex;flex-wrap:wrap;gap:5px}',
        '#peta-legend .leg-item{display:flex;align-items:center;gap:5px;font-size:.66rem;font-weight:600;color:var(--text,#1e293b);padding:3px 8px;border-radius:20px;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0)}',

        /* ── Loader ── */
        '#lf-loader{display:none;position:absolute;inset:0;background:rgba(241,245,249,.9);backdrop-filter:blur(6px);z-index:800;flex-direction:column;align-items:center;justify-content:center;gap:10px}',
        '#lf-loader span{font-size:.72rem;font-weight:700;color:var(--mid,#475569)}',

        /* ── Count Badge ── */
        '#peta-count-badge{position:absolute;top:18px;left:50%;transform:translateX(-50%);z-index:800;background:rgba(15,23,42,.82);backdrop-filter:blur(10px);color:#fff;padding:5px 14px;border-radius:20px;font-size:.66rem;font-weight:700;white-space:nowrap;pointer-events:none;box-shadow:0 3px 14px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);transition:opacity .2s}',

        /* ── FAB ── */
        '.map-fab{position:absolute;z-index:900;width:36px;height:36px;border-radius:10px;background:var(--card,rgba(255,255,255,.95));backdrop-filter:blur(10px);border:1px solid var(--border,rgba(255,255,255,.5));color:var(--text,#1e293b);display:flex;align-items:center;justify-content:center;font-size:.82rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12);transition:all .16s;-webkit-tap-highlight-color:transparent}',
        '.map-fab:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9;box-shadow:0 4px 16px rgba(30,111,217,.35);transform:scale(1.06)}',
        '.map-fab:active{transform:scale(.96)}',

        /* ── Nav Pad ── */
        '#map-nav-wrap{position:absolute;bottom:36px;right:10px;z-index:900;display:flex;flex-direction:column;align-items:flex-end;gap:3px;pointer-events:auto}',
        '#map-nav-panel{display:grid;grid-template-columns:repeat(3,32px);grid-template-rows:repeat(3,32px);gap:3px;padding:6px;border-radius:10px;background:var(--card,rgba(255,255,255,.97));backdrop-filter:blur(12px);border:1px solid var(--border,rgba(0,0,0,.1));box-shadow:0 4px 20px rgba(0,0,0,.14);transition:opacity .2s,transform .2s;transform-origin:bottom right}',
        '#map-nav-panel.hidden{opacity:0;pointer-events:none;transform:scale(.82) translateY(6px)}',
        '#map-nav-panel.visible{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}',
        '.nav-btn{width:32px;height:32px;border-radius:7px;background:var(--bg,#f1f5f9);border:1px solid var(--border,#e2e8f0);color:var(--text,#1e293b);display:flex;align-items:center;justify-content:center;font-size:.72rem;cursor:pointer;transition:all .14s;-webkit-tap-highlight-color:transparent}',
        '.nav-btn:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9;transform:scale(1.08)}',
        '.nav-btn:active{transform:scale(.93)}',
        '.nav-btn.center{background:linear-gradient(135deg,#1e6fd9,#2563eb);color:#fff;border:none;box-shadow:0 2px 8px rgba(37,99,235,.3)}',
        '.nav-btn.center:hover{box-shadow:0 4px 14px rgba(37,99,235,.45);transform:scale(1.1)}',
        '.nav-btn.empty{background:transparent!important;border:none!important;pointer-events:none;box-shadow:none!important}',
        '#nav-toggle-btn{width:32px;height:32px;border-radius:7px;background:var(--card,rgba(255,255,255,.97));backdrop-filter:blur(10px);border:1px solid var(--border,rgba(0,0,0,.15));color:var(--muted,#64748b);display:flex;align-items:center;justify-content:center;font-size:.78rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.1);transition:all .16s;-webkit-tap-highlight-color:transparent;align-self:flex-end}',
        '#nav-toggle-btn:hover{background:#1e6fd9;color:#fff;border-color:#1e6fd9;box-shadow:0 4px 14px rgba(30,111,217,.3)}',
        '#nav-toggle-btn.open{background:#1e6fd9;color:#fff;border-color:#1e6fd9}',

        /* ── Leaflet Popup ── */
        '.leaflet-popup-content-wrapper{background:var(--card,rgba(255,255,255,.97))!important;color:var(--text,#1e293b)!important;backdrop-filter:blur(12px)!important;border:1px solid var(--border,rgba(255,255,255,.6))!important;border-radius:16px!important;box-shadow:0 16px 48px rgba(0,0,0,.14),0 4px 14px rgba(0,0,0,.08)!important;padding:0!important;overflow:hidden!important}',
        '.leaflet-popup-content{margin:14px 16px!important;font-family:inherit!important;font-size:.8rem!important;line-height:1.6!important}',
        '.leaflet-popup-tip-container,.leaflet-popup-tip{display:none!important}',
        '.leaflet-popup-close-button{color:var(--muted,#64748b)!important;font-size:15px!important;top:6px!important;right:8px!important;background:transparent!important;font-weight:900!important}',
        '.leaflet-popup-close-button:hover{color:#e11d48!important}',
        '.lf-popup-title{font-weight:800;font-size:.88rem;line-height:1.35;display:flex;align-items:center;gap:6px;margin-bottom:6px}',
        '.lf-popup-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:.65rem;font-weight:700;margin-bottom:8px}',
        '.lf-popup-row{display:flex;align-items:flex-start;gap:6px;font-size:.75rem;line-height:1.5;margin-top:3px;color:var(--text,#1e293b)}',
        '.lf-popup-row i{width:14px;text-align:center;flex-shrink:0;margin-top:2px;color:var(--muted,#64748b)}',
        '.lf-popup-disp-info{display:flex;align-items:flex-start;gap:6px;background:rgba(217,119,6,.1);border:1px solid rgba(217,119,6,.2);border-radius:8px;padding:7px 10px;font-size:.72rem;color:#92400e;font-weight:600;margin-top:6px;line-height:1.4}',
        '.lf-popup-disp-info i{font-size:.8rem;flex-shrink:0;margin-top:1px;color:#d97706}',
        '.lf-popup-disp-info strong{font-weight:800}',
        '.leaflet-tooltip{background:var(--card,rgba(255,255,255,.96))!important;color:var(--text,#1e3a5f)!important;border:1px solid rgba(30,111,217,.22)!important;border-radius:8px!important;padding:5px 10px!important;font-size:.67rem!important;font-weight:700!important;box-shadow:0 2px 10px rgba(0,0,0,.1)!important;white-space:nowrap!important}',
        '.leaflet-tooltip::before,.leaflet-tooltip-top::before,.leaflet-tooltip-bottom::before{display:none!important}',
        '.leaflet-interactive{outline:none!important}',

        /* ── Spinner ── */
        '.spw{position:relative;width:36px;height:36px}',
        '.spo{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(30,111,217,.15);border-top-color:#1e6fd9;animation:lfSpin .8s linear infinite}',
        '.spi{position:absolute;inset:6px;border-radius:50%;border:2px solid rgba(30,111,217,.1);border-bottom-color:#2563eb;animation:lfSpin .5s linear infinite reverse}',
        '@keyframes lfSpin{to{transform:rotate(360deg)}}',

        /* ── Fullscreen ── */
        '.peta-fs-active{position:fixed!important;inset:0!important;z-index:9999!important;width:100vw!important;height:100dvh!important;border-radius:0!important;background:var(--pb,#f1f5f9)!important}',
        '.peta-fs-active #peta-topbar{background:var(--card,#fff)!important;border-bottom:1px solid var(--border,#e2e8f0)!important;box-shadow:0 2px 12px rgba(0,0,0,.06)!important;padding:8px 16px!important}',
        '.peta-fs-active #peta-topbar .peta-brand-text{color:var(--text,#1e293b)!important}',
        '.peta-fs-active #peta-topbar .p3-btn{background:var(--bg,#f1f5f9)!important;color:var(--text,#1e293b)!important;border-color:var(--border,#e2e8f0)!important}',
        '.peta-fs-active #peta-topbar .p3-date-pill{background:var(--bg,#f1f5f9)!important;color:var(--text,#1e293b)!important;border-color:var(--border,#e2e8f0)!important}',
        '.peta-fs-active #peta-topbar .p3-date-pill.active{background:rgba(30,111,217,.1)!important;border-color:#1e6fd9!important;color:#1e6fd9!important}',
        '.peta-fs-active #leaflet-wrap{margin:6px;border-radius:10px}',
        /* Dark mode fullscreen */
        'body.dark .peta-fs-active{background:var(--pb,#0d1117)!important}',
        'body.dark .peta-fs-active #peta-topbar{background:var(--sb,#161b22)!important;border-bottom-color:var(--border,rgba(255,255,255,.1))!important;box-shadow:0 2px 16px rgba(0,0,0,.4)!important}',
        'body.dark .peta-fs-active #peta-topbar .peta-brand-text{color:var(--pt,#e6edf3)!important}',
        'body.dark .peta-fs-active #peta-topbar .peta-brand-sub{color:var(--pm,#8b949e)!important}',
        'body.dark .peta-fs-active #peta-topbar .p3-btn{background:var(--sb2,#1c2128)!important;color:var(--pt,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.1))!important}',
        'body.dark .peta-fs-active #peta-topbar .p3-btn:hover{background:var(--sb3,#22272e)!important}',
        'body.dark .peta-fs-active #peta-topbar .p3-date-pill{background:var(--sb2,#1c2128)!important;color:var(--pt,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.1))!important}',
        'body.dark .peta-fs-active #peta-topbar .p3-date-pill.active{background:rgba(30,111,217,.25)!important;border-color:#1e6fd9!important;color:#60a5fa!important}',
        'body.dark .peta-fs-active #peta-sidebar{background:var(--sb,#161b22)!important;border-right-color:var(--border,rgba(255,255,255,.1))!important}',
        'body.dark .peta-fs-active #peta-sidebar-header{background:rgba(255,255,255,.04)!important}',
        'body.dark .peta-fs-active .peta-list-card{background:rgba(255,255,255,.05)!important;border-color:rgba(255,255,255,.08)!important}',
        'body.dark .peta-fs-active .peta-list-card:hover{border-color:#1e6fd9!important;background:rgba(30,111,217,.1)!important}',
        'body.dark .peta-fs-active .peta-list-card .card-title{color:#e2e8f0!important}',
        'body.dark .peta-fs-active .peta-list-card .card-meta{color:rgba(148,163,184,.8)!important}',
        'body.dark .peta-fs-active #peta-legend{background:rgba(22,27,34,.95)!important;border-color:rgba(255,255,255,.08)!important}',
        'body.dark .peta-fs-active #peta-legend .leg-title{color:rgba(255,255,255,.6)!important}',
        'body.dark .peta-fs-active #peta-legend .leg-item{color:rgba(255,255,255,.8)!important}',
        'body.dark .peta-fs-active #lf-loader{background:rgba(5,10,25,.88)!important}',
        'body.dark .peta-fs-active #lf-loader span{color:rgba(255,255,255,.5)!important}',
        'body.dark .peta-fs-active #map-nav-panel{background:rgba(22,27,34,.97)!important;border-color:rgba(255,255,255,.1)!important}',
        'body.dark .peta-fs-active .nav-btn{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.1)!important;color:rgba(255,255,255,.8)!important}',
        'body.dark .peta-fs-active .nav-btn:hover{background:#1e6fd9!important;color:#fff!important}',
        'body.dark .peta-fs-active .nav-btn.center{background:linear-gradient(135deg,#1e6fd9,#2563eb)!important;color:#fff!important}',
        'body.dark .peta-fs-active #nav-toggle-btn{background:rgba(22,27,34,.97)!important;border-color:rgba(255,255,255,.1)!important;color:rgba(255,255,255,.7)!important}',
        'body.dark .peta-fs-active #nav-toggle-btn.open,body.dark .peta-fs-active #nav-toggle-btn:hover{background:#1e6fd9!important;color:#fff!important}',
        'body.dark .peta-fs-active #sidebar-toggle{background:rgba(22,27,34,.9);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.6)}',
        'body.dark .peta-fs-active #sidebar-toggle:hover{background:#1e6fd9;color:#fff}',
        'body.dark .peta-fs-active #leaflet-wrap{border-color:rgba(255,255,255,.08)!important}',

        /* ── Responsive ── */
        '@media(max-width:768px){#peta-sidebar{width:0!important;opacity:0;pointer-events:none;position:absolute;left:0;top:0;bottom:0;z-index:1200}#peta-sidebar.mobile-open{width:260px!important;opacity:1;pointer-events:auto;box-shadow:4px 0 24px rgba(0,0,0,.2)}#peta-sidebar-header .sidebar-close{display:flex}#sidebar-toggle{display:none!important}#peta-topbar .peta-brand-sub{display:none}#peta-count-badge{top:10px;font-size:.6rem}}',
        '@media(max-width:480px){#peta-topbar{padding:8px 12px 6px;gap:6px}.p3-btn .btn-lbl{display:none}.p3-date-pill .date-text{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}',

        /* ── Animasi ── */
        '@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
        '.peta-list-card{animation:fadeIn .2s both}',
        /* ── Touch & performa (Sama seperti Agenda) ── */
        '#lf-map-div{width:100%;height:100%;min-height:400px;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;backface-visibility:hidden}',
        '.leaflet-container{touch-action:none;-webkit-overflow-scrolling:touch;backface-visibility:hidden}',
        '.leaflet-map-pane,.leaflet-tile-pane,.leaflet-overlay-pane,.leaflet-marker-pane{touch-action:none;will-change:transform}',

        /* ── Leaflet Layer Control — styled sama seperti peta-agenda ── */
        '.leaflet-control-layers{background:var(--card,#fff)!important;border:1px solid var(--border,#e2e8f0)!important;border-radius:10px!important;box-shadow:0 3px 14px rgba(0,0,0,.12)!important;font-family:var(--font,"Plus Jakarta Sans",system-ui,sans-serif)!important;font-size:.72rem!important;min-width:0!important}',
        '.leaflet-control-layers-toggle{width:34px!important;height:34px!important;background-color:var(--card,#fff)!important;background-image:none!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:9px!important;border:1px solid var(--border,#e2e8f0)!important;box-shadow:0 2px 8px rgba(0,0,0,.1)!important;transition:all .16s!important;cursor:pointer!important}',
        '.leaflet-control-layers-toggle::after{content:"\\f5aa";font-family:"Font Awesome 6 Free";font-weight:900;font-size:.82rem;color:var(--text,#1e293b)}',
        '.leaflet-control-layers-toggle:hover{background:#1e6fd9!important;border-color:#1e6fd9!important}',
        '.leaflet-control-layers-toggle:hover::after{color:#fff}',
        '.leaflet-control-layers-expanded{padding:8px 10px!important;min-width:148px!important}',
        '.leaflet-control-layers-expanded .leaflet-control-layers-toggle{display:none!important}',
        '.leaflet-control-layers-list{margin:0!important}',
        '.leaflet-control-layers-base label{display:flex!important;align-items:center!important;gap:7px!important;padding:6px 7px!important;border-radius:7px!important;cursor:pointer!important;transition:background .13s!important;color:var(--text,#1e293b)!important;font-size:.73rem!important;font-weight:600!important;white-space:nowrap!important;margin:1px 0!important}',
        '.leaflet-control-layers-base label:hover{background:var(--bg,#f1f5f9)!important}',
        '.leaflet-control-layers-base label input{width:14px!important;height:14px!important;accent-color:#1e6fd9!important;flex-shrink:0!important;cursor:pointer!important}',
        '.leaflet-control-layers-separator{border-top:1px solid var(--border,#e2e8f0)!important;margin:4px 0!important}',
        /* Dark mode layer control */
        'body.dark .leaflet-control-layers{background:var(--sb,#161b22)!important;border-color:var(--border,rgba(255,255,255,.1))!important;box-shadow:0 4px 20px rgba(0,0,0,.4)!important}',
        'body.dark .leaflet-control-layers-toggle{background-color:var(--sb,#161b22)!important;border-color:var(--border,rgba(255,255,255,.12))!important}',
        'body.dark .leaflet-control-layers-toggle::after{color:var(--pt,#e6edf3)}',
        'body.dark .leaflet-control-layers-base label{color:var(--pt,#e6edf3)!important}',
        'body.dark .leaflet-control-layers-base label:hover{background:rgba(255,255,255,.07)!important}',
        'body.dark .leaflet-control-layers-separator{border-color:rgba(255,255,255,.1)!important}',
        /* Zoom control */
        '.leaflet-control-zoom{border:none!important;box-shadow:none!important}',
        '.leaflet-control-zoom-in,.leaflet-control-zoom-out{width:32px!important;height:32px!important;line-height:32px!important;background:var(--card,#fff)!important;color:var(--text,#1e293b)!important;border:1px solid var(--border,#e2e8f0)!important;border-radius:8px!important;box-shadow:0 2px 8px rgba(0,0,0,.1)!important;font-size:.9rem!important;font-weight:700!important;transition:all .16s!important;display:flex!important;align-items:center!important;justify-content:center!important;margin-bottom:3px!important}',
        '.leaflet-control-zoom-in:hover,.leaflet-control-zoom-out:hover{background:#1e6fd9!important;color:#fff!important;border-color:#1e6fd9!important}',
        'body.dark .leaflet-control-zoom-in,body.dark .leaflet-control-zoom-out{background:var(--sb,#161b22)!important;color:var(--pt,#e6edf3)!important;border-color:var(--border,rgba(255,255,255,.1))!important}',
    ].join('');
    document.head.appendChild(s);
}


// ─────────────────────────────────────────────────────────────────────────────
//  6. LOAD PETA — entry point
// ─────────────────────────────────────────────────────────────────────────────
function loadPeta() {
    _injectPetaStyles();
    _checkMobileLayout();
    document.addEventListener('keydown', _onKeyEsc);

    // Jangan inisialisasi ulang jika map sudah ada dan masih di DOM
    if (_lfMap) {
        if (!document.body.contains(_lfMap.getContainer())) {
            try { _lfMap.off(); _lfMap.remove(); } catch (e) { }
            _lfMap = null;
        } else {
            setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 80);
            refreshLeaflet();
            return;
        }
    }

    _destroyLeaflet();
    document.removeEventListener('keydown', _onKeyEsc);

    var legendHtml = SIMBOL_DEF.map(function (it) {
        return '<div class="leg-item"><i class="fas ' + it.ico + '" style="color:' + it.warna + '"></i>' + it.label + '</div>';
    }).join('');

    var h = '<div class="peta-container" id="peta-main-wrap" style="padding:0!important;position:relative;display:flex;flex-direction:column;flex:1;height:100%">'

        /* ─ Topbar ─ */
        + '<div id="peta-topbar">'
        + '<div class="peta-brand">'
        + '<div class="peta-brand-ico"><i class="bi bi-geo-alt-fill"></i></div>'
        + '<div>'
        + '<div class="peta-brand-text">Peta Agenda</div>'
        + '<div class="peta-brand-sub">Agenda Bupati Ponorogo</div>'
        + '</div>'
        + '</div>'
        + '<div class="peta-controls">'

        /* Date filter — tanpa tombol X */
        + '<div class="p3-date-pill" id="peta-date-pill" onclick="_openDatePicker()" title="Filter Tanggal">'
        + '<i class="bi bi-calendar-event" style="color:#1e6fd9"></i>'
        + '<span class="date-text" id="peta-date-display">Tanggal</span>'
        + '<input type="date" id="peta-date-filter" onchange="_onDateChange(this)">'
        + '</div>'

        /* Dropdown rentang waktu: Hari Ini / Besok / Minggu Ini */
        + '<div style="position:relative;display:inline-block">'
        + '<button class="p3-btn" id="btn-peta-minggu" onclick="_toggleRangeDropdown(event)" title="Pilih rentang waktu" style="font-size:.75rem">'
        + '<i class="bi bi-calendar-range"></i>'
        + '<span class="btn-lbl" id="peta-range-label">Tanggal</span>'
        + '<i class="bi bi-chevron-down" style="font-size:.55rem;margin-left:2px"></i>'
        + '</button>'
        + '<div id="peta-range-dropdown" style="display:none;position:absolute;top:calc(100% + 6px);left:0;z-index:2000;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:160px;overflow:hidden;padding:4px 0">'
        + '<button onclick="_setProtoRange(\'today\')" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:rgba(30,111,217,.08);font-size:.82rem;font-weight:700;cursor:pointer;color:#1e6fd9;font-family:inherit;text-align:left;transition:background .15s" id="peta-ropt-today"><i class="bi bi-calendar-check" style="width:16px;color:#1e6fd9"></i> Tanggal</button>'
        + '<button onclick="_setProtoRange(\'tomorrow\')" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:none;font-size:.82rem;font-weight:600;cursor:pointer;color:var(--text,#1e293b);font-family:inherit;text-align:left;transition:background .15s" id="peta-ropt-tomorrow"><i class="bi bi-calendar-plus" style="width:16px;color:#1e6fd9"></i> Besok</button>'
        + '<div style="height:1px;background:var(--border,#e2e8f0);margin:2px 0"></div>'
        + '<button onclick="_setProtoRange(\'week\')" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;background:none;font-size:.82rem;font-weight:600;cursor:pointer;color:var(--text,#1e293b);font-family:inherit;text-align:left;transition:background .15s" id="peta-ropt-week"><i class="bi bi-calendar-week" style="width:16px;color:#1e6fd9"></i> Minggu Ini</button>'
        + '</div>'
        + '</div>'

        /* Sidebar toggle — always visible in topbar for both desktop & mobile */
        + '<button class="p3-btn p3-btn-icon" id="peta-sidebar-toggle-btn" onclick="_toggleSidebarAuto()" title="Daftar Agenda">'
        + '<i class="bi bi-layout-sidebar" id="peta-sb-tog-ico"></i>'
        + '</button>'

        /* Refresh */
        + '<button class="p3-btn p3-btn-primary" onclick="reloadPetaActive()" title="Refresh Peta">'
        + '<i class="bi bi-arrow-clockwise"></i>'
        + '<span class="btn-lbl">Refresh</span>'
        + '</button>'

        /* Fullscreen */
        + '<button class="p3-btn" id="btn-fullscreen" onclick="togglePetaFullscreen()" title="Layar Penuh">'
        + '<i class="bi bi-arrows-fullscreen" id="btn-fs-ico"></i>'
        + '<span class="btn-lbl" id="btn-fs-lbl">Layar Penuh</span>'
        + '</button>'
        + '</div>'
        + '</div>'

        /* ─ Map Area ─ */
        + '<div id="peta-map-area" style="flex:1;min-height:0;display:flex;flex-direction:row;position:relative;overflow:hidden;height:0">'

        /* Sidebar */
        + '<div id="peta-sidebar">'
        + '<div id="peta-sidebar-header">'
        + '<i class="bi bi-list-ul" style="color:#1e6fd9"></i>'
        + '<span class="sidebar-title">Daftar Agenda</span>'
        + '<span id="peta-count-text" style="font-size:.62rem;color:var(--muted);font-family:var(--mono,monospace)">0</span>'
        + '<button class="sidebar-close" onclick="_toggleSidebarMobile()" title="Tutup"><i class="bi bi-x-lg"></i></button>'
        + '</div>'
        + '<div id="peta-list-wrap"><div style="padding:20px;text-align:center;color:var(--muted);font-size:.75rem"><i class="fas fa-spinner fa-spin"></i><p style="margin-top:8px">Memuat...</p></div></div>'
        + '<div id="peta-legend">'
        + '<div class="leg-title"><i class="bi bi-info-circle-fill"></i> Keterangan</div>'
        + '<div class="leg-grid">' + legendHtml + '</div>'
        + '</div>'
        + '</div>'

        /* Sidebar toggle strip — inside leaflet-outer so it's always visible */
        + '<div id="leaflet-outer" style="flex:1;min-width:0;position:relative;display:flex;flex-direction:column;min-height:0">'
        + '<div id="leaflet-wrap" style="flex:1;min-height:400px;border-radius:12px;overflow:hidden;border:1px solid var(--border,#e2e8f0);box-shadow:0 4px 20px rgba(0,0,0,.06);position:relative">'
        + '<div id="lf-map-div" style="width:100%;height:100%;min-height:400px;position:absolute;inset:0"></div>'

        /* Loader */
        + '<div id="lf-loader">'
        + '<div class="spw"><div class="spo"></div><div class="spi"></div></div>'
        + '<span>Memuat data peta...</span>'
        + '</div>'

        /* Count badge */
        + '<div id="peta-count-badge" style="opacity:0">— lokasi</div>'

        /* Navigation pad */
        + '<div id="map-nav-wrap">'
        + '<div id="map-nav-panel" class="hidden">'
        + '<button class="nav-btn empty"></button>'
        + '<button class="nav-btn" onclick="_mapPan(0,-80)" title="Atas"><i class="bi bi-chevron-up"></i></button>'
        + '<button class="nav-btn empty"></button>'
        + '<button class="nav-btn" onclick="_mapPan(-80,0)" title="Kiri"><i class="bi bi-chevron-left"></i></button>'
        + '<button class="nav-btn center" onclick="_mapCenter()" title="Ke Pusat"><i class="bi bi-bullseye"></i></button>'
        + '<button class="nav-btn" onclick="_mapPan(80,0)" title="Kanan"><i class="bi bi-chevron-right"></i></button>'
        + '<button class="nav-btn" onclick="_mapZoom(1)" title="Zoom In"><i class="bi bi-plus-lg"></i></button>'
        + '<button class="nav-btn" onclick="_mapPan(0,80)" title="Bawah"><i class="bi bi-chevron-down"></i></button>'
        + '<button class="nav-btn" onclick="_mapZoom(-1)" title="Zoom Out"><i class="bi bi-dash-lg"></i></button>'
        + '</div>'
        + '<button id="nav-toggle-btn" onclick="_toggleNavPanel()" title="Kontrol Navigasi"><i class="bi bi-compass"></i></button>'
        + '</div>'

        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>';

    var root = G('peta-agenda-root');
    if (root) root.innerHTML = h;

    // Set label tanggal awal — tampilkan nama hari ini yang sebenarnya
    var initDisplay = G('peta-date-display');
    if (initDisplay) initDisplay.textContent = _buildDatePillLabel('today');
    // Set label tombol dropdown juga dengan tanggal nyata
    var initRangeLabel = G('peta-range-label');
    if (initRangeLabel) initRangeLabel.textContent = _buildDatePillLabel('today');

    document.addEventListener('keydown', _onKeyEsc);

    // Inisialisasi awal responsivitas
    _checkMobileLayout();

    // Bersihkan listener lama sebelum pasang baru
    window.removeEventListener('resize', _checkMobileLayout);
    window.addEventListener('resize', _checkMobileLayout);

    _initLeaflet();
}


// ─────────────────────────────────────────────────────────────────────────────
//  7. INIT LEAFLET
// ─────────────────────────────────────────────────────────────────────────────
function _ensureLeafletLoaded(cb) {
    if (window.L) { cb(); return; }
    function lC(h, i) {
        if (document.getElementById(i)) return;
        var l = document.createElement('link'); l.id = i; l.rel = 'stylesheet'; l.href = h;
        document.head.appendChild(l);
    }
    function lS(src, fn) {
        var e = document.createElement('script'); e.src = src; e.onload = fn;
        document.head.appendChild(e);
    }
    lC('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'lf-css');
    lS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', cb);
}

function _initLeaflet() {
    _ensureLeafletLoaded(function () {
        var md = G('lf-map-div');
        if (!md) return;

        // Reuse existing map if container still in DOM
        if (_lfMap) {
            if (!document.body.contains(_lfMap.getContainer())) {
                try { _lfMap.off(); _lfMap.remove(); } catch (e) { }
                _lfMap = null;
            } else {
                setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 80);
                refreshLeaflet();
                return;
            }
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

        // Tile layers — Google Hybrid default, urutan: Hybrid, OSM, Satelit, Google Sat, CartoDB
        var hybL = L.tileLayer(TILE_LAYERS.hybrid.url, { attribution: TILE_LAYERS.hybrid.attr, maxZoom: TILE_LAYERS.hybrid.maxZoom, crossOrigin: true });
        var osmL = L.tileLayer(TILE_LAYERS.osm.url, { attribution: TILE_LAYERS.osm.attr, maxZoom: TILE_LAYERS.osm.maxZoom, crossOrigin: true });
        var satL = L.tileLayer(TILE_LAYERS.satellite.url, { attribution: TILE_LAYERS.satellite.attr, maxZoom: TILE_LAYERS.satellite.maxZoom, crossOrigin: true });
        var gsL = L.tileLayer(TILE_LAYERS.google_sat.url, { attribution: TILE_LAYERS.google_sat.attr, maxZoom: TILE_LAYERS.google_sat.maxZoom, crossOrigin: true });
        var ctL = L.tileLayer(TILE_LAYERS.carto.url, { attribution: TILE_LAYERS.carto.attr, maxZoom: TILE_LAYERS.carto.maxZoom, crossOrigin: true });

        hybL.addTo(_lfMap);
        _currentBaseLayer = hybL;

        // Layer control — Google Hybrid paling atas
        L.control.layers({
            '<i class="bi bi-globe" style="color:#ea580c"></i> Google Hybrid': hybL,
            '<i class="bi bi-map" style="color:#1e6fd9"></i> OpenStreetMap': osmL,
            '<i class="bi bi-globe-americas" style="color:#0d9268"></i> Satelit Esri': satL,
            '<i class="bi bi-camera" style="color:#7c3aed"></i> Google Satelit': gsL,
            '<i class="bi bi-geo-alt" style="color:#b45309"></i> CartoDB': ctL
        }, {}, { collapsed: true, position: 'topright' }).addTo(_lfMap);

        _lfMap.on('baselayerchange', function (e) { _currentBaseLayer = e.layer; });

        // Zoom control (topleft)
        L.control.zoom({ position: 'topleft' }).addTo(_lfMap);

        // Scale
        L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 100 }).addTo(_lfMap);

        // Click: tutup mobile sidebar
        _lfMap.on('click', function () {
            var sb = G('peta-sidebar');
            if (sb && sb.classList.contains('mobile-open')) sb.classList.remove('mobile-open');
        });

        _lfLayerGroupDF = L.layerGroup().addTo(_lfMap);

        // ResizeObserver
        var lw = G('leaflet-wrap');
        if (lw && window.ResizeObserver) {
            _resizeObserver = new ResizeObserver(function () {
                if (_lfMap) _lfMap.invalidateSize({ animate: false });
            });
            _resizeObserver.observe(lw);
        }

        // Window resize fallback (named function to avoid leaks)
        if (_lfRZHandler) window.removeEventListener('resize', _lfRZHandler);
        _lfRZHandler = function () {
            if (_lfMap) _lfMap.invalidateSize({ animate: false });
        };
        window.addEventListener('resize', _lfRZHandler);

        refreshLeaflet();

        // Beberapa invalidate awal
        [80, 300, 700].forEach(function (t) {
            setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, t);
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  8. DESTROY LEAFLET
// ─────────────────────────────────────────────────────────────────────────────
function _destroyLeaflet() {
    if (_resizeObserver) { _resizeObserver.disconnect(); _resizeObserver = null; }
    if (_lfRZHandler) { window.removeEventListener('resize', _lfRZHandler); _lfRZHandler = null; }
    if (_lfMap) { try { _lfMap.off(); _lfMap.remove(); } catch (e) { } _lfMap = null; }
    _lfMarkersLP = [];
    _lfLayerGroupDF = null;
    _currentBaseLayer = null;
    _isFirstLoad = true;
    _petaProtoFilterMode = 'today';
}


// ─────────────────────────────────────────────────────────────────────────────
//  9. REFRESH DATA & RENDER MARKERS
// ─────────────────────────────────────────────────────────────────────────────
function refreshLeaflet() {
    if (!_lfMap) { _initLeaflet(); return; }
    _lfShowLoad('Memuat data agenda...');

    // Ambil agenda dan disposisi sekaligus
    Promise.all([
        callAPI('getAgenda', {}),
        callAPI('getDisposisi', {})
    ]).then(function (results) {
        _lfHideLoad();
        var agendaRes = results[0];
        var dispRes = results[1];

        if (!agendaRes.success) { toast('Gagal memuat agenda: ' + (agendaRes.message || ''), 'er'); return; }

        // Buat map disposisi: agendaId → kepada
        var dispMap = {};
        if (dispRes && dispRes.success && dispRes.data) {
            dispRes.data.forEach(function (d) {
                var refId = d['Referensi Agenda ID'] || '';
                if (refId && refId !== '-' && !dispMap[refId]) {
                    dispMap[refId] = d['Kepada'] || '';
                }
            });
        }

        var filterEl = G('peta-date-filter');
        var selectedDate = filterEl ? filterEl.value : '';
        var today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
        var tomorrow = new Date(Date.now() + 7 * 60 * 60 * 1000 + 86400000).toISOString().split('T')[0];
        var mode = _petaProtoFilterMode || 'today';

        // Set default hari ini saat pertama load (hanya jika mode today dan belum ada tanggal)
        if (!selectedDate && mode === 'today') {
            // Tidak perlu set input value — mode today sudah cukup
        }

        var data = (agendaRes.data || []).filter(function (d) {
            var lat = parseFloat(d['Latitude']);
            var lng = parseFloat(d['Longitude']);
            if (!lat || !lng || lat === 0 || lng === 0) return false;

            var agendaDate = (d['Tanggal Pelaksanaan'] || d['Tanggal'] || '').substring(0, 10);

            if (mode === 'today') {
                return agendaDate === today;
            } else if (mode === 'tomorrow') {
                return agendaDate === tomorrow;
            } else if (mode === 'date' && selectedDate) {
                return agendaDate === selectedDate;
            } else if (mode === 'week') {
                // 7 hari ke depan dari hari ini
                var d7 = new Date(Date.now() + 7 * 60 * 60 * 1000);
                d7.setUTCDate(d7.getUTCDate() + 6);
                var end7 = d7.toISOString().split('T')[0];
                return agendaDate >= today && agendaDate <= end7;
            }
            return agendaDate === today;
        });

        // Inject disposisi info
        data.forEach(function (d) {
            if (d['Status Kehadiran'] === 'Disposisi') {
                d._disposisiKepada = dispMap[d['ID']] || '';
            }
        });

        _layerData = data;
        _renderLeafletLayers(data);
        _loadMapDrawings();

        var badge = G('peta-count-badge');
        if (badge) {
            badge.textContent = data.length + ' lokasi agenda';
            badge.style.opacity = data.length ? '1' : '0';
        }
        var countEl = G('peta-count-text');
        if (countEl) countEl.textContent = data.length;

    }).catch(function (e) {
        _lfHideLoad();
        toast('Gagal memuat agenda: ' + e.message, 'er');
    });
}

function _renderLeafletLayers(data) {
    // Hapus marker lama
    _lfMarkersLP.forEach(function (m) { _lfMap.removeLayer(m); });
    _lfMarkersLP = [];

    var listWrap = G('peta-list-wrap');
    var listHtml = [];

    var formatTgl = typeof fmtDate === 'function' ? fmtDate : function (d) { return d; };
    var safeStr = typeof esc === 'function' ? esc : function (s) { return String(s || ''); };

    data.forEach(function (d, idx) {
        var lat = parseFloat(d['Latitude']);
        var lng = parseFloat(d['Longitude']);
        var status = d['Status Kehadiran'] || 'Hadir';
        var sd = getSimbolDef(status);
        var warna = sd.warna;
        var ico = sd.ico;
        var cpFormatted = formatWA(safeStr(d['Penanggung Jawab'] || d['CP'] || '-'));

        // Tanggal — coba beberapa field
        var tglVal = d['Tanggal Pelaksanaan'] || d['Tanggal'] || '';
        var tglFormatted = tglVal ? formatTgl(tglVal) : '';

        var popup = ''
            + '<div class="lf-popup-title"><i class="fas ' + ico + '" style="color:' + warna + '"></i>' + safeStr(d['Nama Kegiatan'] || d['Perihal'] || 'Agenda') + '</div>'
            + '<div class="lf-popup-badge" style="background:' + warna + '20;color:' + warna + '">' + safeStr(status) + '</div>'
            + (status === 'Disposisi' && d._disposisiKepada ? '<div class="lf-popup-disp-info"><i class="bi bi-arrow-right-circle-fill"></i><span>Disposisi kepada: <strong>' + safeStr(d._disposisiKepada) + '</strong></span></div>' : '')
            + '<table style="font-size:.78rem;width:100%;border-collapse:collapse;margin-top:6px">'
            + (d['Penyelenggara'] ? '<tr><td style="color:var(--muted,#64748b);padding:2px 8px 2px 0;width:36%;white-space:nowrap">Penyelenggara</td><td><strong>' + safeStr(d['Penyelenggara']) + '</strong></td></tr>' : '')
            + (tglFormatted ? '<tr><td style="color:var(--muted,#64748b);padding:2px 8px 2px 0">Tanggal</td><td><strong>' + tglFormatted + '</strong></td></tr>' : '')
            + (d['Waktu'] ? '<tr><td style="color:var(--muted,#64748b);padding:2px 8px 2px 0">Waktu</td><td>' + safeStr(d['Waktu']) + '</td></tr>' : '')
            + (d['Lokasi'] ? '<tr><td style="color:var(--muted,#64748b);padding:2px 8px 2px 0">Lokasi</td><td>' + safeStr(d['Lokasi']) + '</td></tr>' : '')
            + (cpFormatted !== '-' ? '<tr><td style="color:var(--muted,#64748b);padding:2px 8px 2px 0;vertical-align:top">Contact</td><td style="line-height:1.4">' + cpFormatted + '</td></tr>' : '')
            + '</table>';

        // Tombol lihat surat — escape URL agar aman di onclick
        if (d['URL'] && d['URL'] !== '-' && d['URL'] !== '') {
            var safeUrl = d['URL'].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            popup += '<button onclick="petaOpenFileViewer(\'' + safeUrl + '\')" style="display:flex;align-items:center;gap:5px;margin-top:8px;padding:6px 10px;background:rgba(30,111,217,.1);color:#1e6fd9;border:1px solid rgba(30,111,217,.25);border-radius:8px;font-size:.74rem;font-weight:700;cursor:pointer;width:100%;justify-content:center"><i class="bi bi-file-earmark-text"></i> Lihat Surat/Undangan</button>';
        }

        popup += '<a href="https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng + '" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:5px;margin-top:8px;padding:7px;background:linear-gradient(135deg,#1e6fd9,#2563eb);color:#fff;text-align:center;border-radius:9px;text-decoration:none;font-weight:700;font-size:.76rem;box-shadow:0 2px 8px rgba(37,99,235,.3)"><i class="fas fa-map-marker-alt"></i> Buka di Google Maps</a>'
            + '<div style="margin-top:7px;font-size:.62rem;color:var(--muted,#64748b);text-align:right"><i class="fas fa-crosshairs"></i> ' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '</div>';

        var m = L.marker([lat, lng], { icon: _makeLeafletIcon(warna, ico) })
            .addTo(_lfMap)
            .bindPopup(popup, { maxWidth: 290, className: 'lf-clean-popup', autoPan: false });
        m.agendaData = d;
        _lfMarkersLP.push(m);

        // Sidebar card
        var tgl = formatTgl(d['Tanggal Pelaksanaan'] || d['Tanggal'] || '');
        var waktu = d['Waktu'] ? ' · ' + safeStr(d['Waktu']) : '';
        listHtml.push(''
            + '<div class="peta-list-card" onclick="focusPetaMarker(' + idx + ')" style="animation-delay:' + (idx * 0.03) + 's">'
            + '<div class="card-badge" style="background:' + warna + '18;color:' + warna + '"><i class="fas ' + ico + '"></i> ' + safeStr(status) + '</div>'
            + '<div class="card-title">' + safeStr(d['Perihal'] || d['Nama Kegiatan'] || 'Agenda') + '</div>'
            + (status === 'Disposisi' && d._disposisiKepada ? '<div class="card-meta" style="color:' + warna + ';font-weight:700"><i class="bi bi-arrow-right-circle-fill" style="color:' + warna + '"></i><span>→ ' + safeStr(d._disposisiKepada) + '</span></div>' : '')
            + (d['Lokasi'] ? '<div class="card-meta"><i class="fas fa-map-marker-alt" style="color:' + warna + '"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + safeStr(d['Lokasi']) + '</span></div>' : '')
            + '<div class="card-meta"><i class="fas fa-clock" style="color:var(--muted)"></i><span>' + tgl + waktu + '</span></div>'
            + '</div>'
        );
    });

    // Fit bounds (hanya pada load pertama agar tidak nyendat saat refresh data)
    if (_lfMarkersLP.length > 0 && _isFirstLoad) {
        var group = L.featureGroup(_lfMarkersLP);
        _lfMap.fitBounds(group.getBounds().pad(0.18), { animate: false });
        _isFirstLoad = false;
    }

    // Render sidebar list
    if (listWrap) {
        if (data.length === 0) {
            listWrap.innerHTML = '<div style="padding:30px 16px;text-align:center;color:var(--muted);font-size:.76rem"><i class="bi bi-geo-alt" style="font-size:1.4rem;display:block;margin-bottom:8px;opacity:.25"></i>Belum ada agenda yang sesuai atau memiliki koordinat.</div>';
        } else {
            listWrap.innerHTML = listHtml.join('');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  10. IKON MARKER
// ─────────────────────────────────────────────────────────────────────────────
function _makeLeafletIcon(warna, faIco) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">'
        + '<ellipse cx="16" cy="39" rx="5" ry="2.5" fill="rgba(0,0,0,.2)"/>'
        + '<path d="M16 0C9.37 0 4 5.37 4 12c0 9.5 12 28 12 28S28 21.5 28 12C28 5.37 22.63 0 16 0z" fill="' + warna + '"/>'
        + '<circle cx="16" cy="12" r="8" fill="rgba(255,255,255,.22)"/>'
        + '</svg>';
    return L.divIcon({
        html: '<div style="position:relative;width:32px;height:42px">' + svg
            + '<i class="fas ' + faIco + '" style="position:absolute;top:6px;left:50%;transform:translateX(-50%);color:#fff;font-size:9px;pointer-events:none"></i></div>',
        className: '',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42]
    });
}


// ─────────────────────────────────────────────────────────────────────────────
//  11. LOAD MAP DRAWINGS (read-only)
// ─────────────────────────────────────────────────────────────────────────────
function _loadMapDrawings() {
    if (!_lfMap) return;
    callAPI('getMapDrawings', {}).then(function (res) {
        if (!res.success || !res.data) return;
        if (_lfLayerGroupDF) _lfLayerGroupDF.clearLayers();
        res.data.forEach(function (d) {
            try {
                var gj = JSON.parse(d.geojson);
                var w = d.warna || '#1e6fd9';
                var isLine = gj.geometry && gj.geometry.type === 'LineString';
                var opts = isLine
                    ? { color: w, weight: 3.5, opacity: .9, dashArray: '7 5' }
                    : { color: w, weight: 2, fillColor: w, fillOpacity: .15, opacity: .9 };
                var lyr = L.geoJSON(gj, { style: opts });
                lyr.eachLayer(function (sub) {
                    if (_lfLayerGroupDF) sub.addTo(_lfLayerGroupDF);
                    else sub.addTo(_lfMap);
                    if (d.nama) {
                        var ico = isLine ? 'fa-pen-nib' : 'fa-vector-square';
                        var label = isLine ? 'Garis / Rute' : 'Area / Zona';
                        var msr = d.measurement || '';
                        var safeStr = typeof esc === 'function' ? esc : function (s) { return String(s || ''); };
                        var popupHtml = '<div class="lf-popup-title"><i class="fas ' + ico + '" style="color:' + w + '"></i>' + safeStr(d.nama) + '</div>'
                            + '<div class="lf-popup-badge" style="background:' + w + '18;color:' + w + '">' + label + '</div>'
                            + (msr ? '<div class="lf-popup-row"><i class="fas fa-ruler"></i><span style="font-family:var(--mono,monospace);font-size:.7rem;font-weight:800;color:' + w + '">' + msr + '</span></div>' : '')
                            + (d.ket ? '<div class="lf-popup-row"><i class="fas fa-info-circle"></i><span>' + safeStr(d.ket) + '</span></div>' : '');
                        sub.bindPopup(popupHtml, { maxWidth: 260, className: 'lf-clean-popup', autoPan: false });
                        if (msr) {
                            sub.bindTooltip('<b>' + msr + '</b>', { permanent: false, sticky: true, direction: 'top', offset: [0, -8], opacity: 1 });
                        }
                    }
                });
            } catch (e) { console.warn('Error loading drawing:', e); }
        });
    }).catch(function (e) { console.warn('Failed to load map drawings:', e); });
}

// ─────────────────────────────────────────────────────────────────────────────
//  12. FOCUS MARKER (dipanggil dari protokol.js)
// ─────────────────────────────────────────────────────────────────────────────
function focusPetaMarker(idx) {
    if (!_lfMarkersLP[idx]) return;
    var latlng = _lfMarkersLP[idx].getLatLng();
    if (_lfMap) {
        var sb = G('peta-sidebar');
        if (sb && sb.classList.contains('mobile-open')) sb.classList.remove('mobile-open');
        _lfMap.flyTo(latlng, 16, { animate: true, duration: 0.8 });
        setTimeout(function () { _lfMarkersLP[idx].openPopup(); }, 500);
    }
}

function focusAgendaOnMap(agendaId) {
    var attempts = 0;
    var intv = setInterval(function () {
        if (_lfMap && _lfMarkersLP.length > 0) {
            clearInterval(intv);
            var marker = null;
            for (var i = 0; i < _lfMarkersLP.length; i++) {
                if (String(_lfMarkersLP[i].agendaData && _lfMarkersLP[i].agendaData.ID) === String(agendaId)) {
                    marker = _lfMarkersLP[i];
                    break;
                }
            }
            if (marker) {
                _lfMap.flyTo(marker.getLatLng(), 17, { animate: true, duration: 0.8 });
                setTimeout(function () { marker.openPopup(); }, 500);
            } else {
                toast('Titik lokasi tidak ditemukan di peta.', 'inf');
            }
            return;
        }
        attempts++;
        if (attempts > 20) clearInterval(intv);
    }, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
//  13. FULLSCREEN
// ─────────────────────────────────────────────────────────────────────────────
function togglePetaFullscreen() {
    _petaFullscreen = !_petaFullscreen;
    var wrap = G('peta-main-wrap');
    var ico = G('btn-fs-ico');
    var lbl = G('btn-fs-lbl');
    var ptopbar = document.getElementById('ptopbar'); // topbar protokol

    if (_petaFullscreen) {
        if (wrap) wrap.classList.add('peta-fs-active');
        if (ico) ico.className = 'bi bi-fullscreen-exit';
        if (lbl) lbl.textContent = 'Keluar';
        if (ptopbar) ptopbar.style.display = 'none';
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
    } else {
        if (wrap) wrap.classList.remove('peta-fs-active');
        if (ico) ico.className = 'bi bi-arrows-fullscreen';
        if (lbl) lbl.textContent = 'Layar Penuh';
        if (ptopbar) ptopbar.style.display = '';
        document.body.style.overflow = '';
    }

    if (_lfMap) {
        [50, 300, 600].forEach(function (t) {
            setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, t);
        });
    }
}

function reloadPetaActive() { refreshLeaflet(); }

// ─────────────────────────────────────────────────────────────────────────────
//  FILE VIEWER INLINE (untuk popup peta)
// ─────────────────────────────────────────────────────────────────────────────
function petaOpenFileViewer(url) {
    if (!url || url === '-' || url === '') { toast('File tidak tersedia.', 'er'); return; }

    // Hapus modal lama jika ada
    var existing = document.getElementById('peta-fv-modal');
    if (existing) existing.remove();

    var urlLower = url.toLowerCase();
    var isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(urlLower);
    var bodyHtml = '';

    // Ekstrak Google Drive file ID dari berbagai format URL
    var driveId = null;
    var m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    var m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m1) driveId = m1[1];
    else if (m2) driveId = m2[1];

    if (isImage) {
        var imgUrl = driveId
            ? 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1200'
            : url;
        bodyHtml = '<div style="display:flex;align-items:center;justify-content:center;width:100%;max-height:82vh;overflow:auto">'
            + '<img src="' + imgUrl + '" style="max-width:100%;max-height:82vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.4);object-fit:contain" '
            + 'onerror="this.src=\'' + url.replace(/'/g, '%27') + '\'" /></div>';
    } else {
        // PDF, DOCX, atau file lain — gunakan Google Drive preview
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
        + '<div style="color:#fff;font-weight:700;font-size:.9rem;display:flex;align-items:center;gap:8px">'
        + '<i class="bi bi-file-earmark-text" style="color:#60a5fa"></i> Surat / Undangan'
        + '</div>'
        + '<div style="display:flex;gap:8px">'
        + '<a href="' + url + '" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(255,255,255,.12);color:#fff;border-radius:8px;font-size:.75rem;font-weight:700;text-decoration:none;border:1px solid rgba(255,255,255,.2);white-space:nowrap">'
        + '<i class="bi bi-box-arrow-up-right"></i> Buka Tab Baru'
        + '</a>'
        + '<button onclick="var m=document.getElementById(\'peta-fv-modal\');if(m)m.remove()" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(225,29,72,.75);color:#fff;border:none;border-radius:8px;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap">'
        + '<i class="bi bi-x-lg"></i> Tutup'
        + '</button>'
        + '</div>'
        + '</div>'
        + bodyHtml;

    // Tutup saat klik backdrop
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    // Tutup dengan ESC
    var escHandler = function (e) {
        if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(modal);
}

// ─────────────────────────────────────────────────────────────────────────────
//  14. NAV PANEL
// ─────────────────────────────────────────────────────────────────────────────
function _toggleNavPanel() {
    _navPanelOpen = !_navPanelOpen;
    var panel = G('map-nav-panel');
    var btn = G('nav-toggle-btn');
    if (panel) {
        panel.classList.toggle('hidden', !_navPanelOpen);
        panel.classList.toggle('visible', _navPanelOpen);
    }
    if (btn) btn.classList.toggle('open', _navPanelOpen);
}

function _mapPan(x, y) { if (_lfMap) _lfMap.panBy([x, y], { animate: true, duration: 0.25 }); }
function _mapZoom(delta) { if (_lfMap) { if (delta > 0) _lfMap.zoomIn(1, { animate: true }); else _lfMap.zoomOut(1, { animate: true }); } }
function _mapCenter() { if (_lfMap) _lfMap.flyTo(PETA_CENTER, PETA_ZOOM, { animate: true, duration: 1 }); }

// ─────────────────────────────────────────────────────────────────────────────
//  15. DATE FILTER & RANGE DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
// Mode filter peta protokol: 'today' | 'tomorrow' | 'week' | 'date'
var _petaProtoFilterMode = 'today';

// Helper: format tanggal singkat "Sen, 5 Mei"
function _fmtShort(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

// Helper: hitung label date pill berdasarkan mode
function _buildDatePillLabel(mode) {
    var now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    var today = now.toISOString().split('T')[0];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    if (mode === 'today') {
        return _fmtShort(today);
    } else if (mode === 'tomorrow') {
        var tom = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
        return _fmtShort(tom);
    } else if (mode === 'week') {
        // Rentang: hari ini s/d +6 hari
        var startD = now;
        var endD = new Date(now.getTime() + 6 * 86400000);
        var startM = months[startD.getMonth()];
        var endM = months[endD.getMonth()];
        var startY = startD.getFullYear();
        var endY = endD.getFullYear();
        if (startM === endM && startY === endY) {
            // Bulan & tahun sama: "5–12 Mei 2026"
            return startD.getDate() + '–' + endD.getDate() + ' ' + endM + ' ' + endY;
        } else {
            // Beda bulan: "28 Apr–4 Mei 2026"
            return startD.getDate() + ' ' + startM + '–' + endD.getDate() + ' ' + endM + ' ' + endY;
        }
    }
    return _fmtShort(today);
}

// Tutup dropdown saat klik di luar
document.addEventListener('click', function (e) {
    var dd = G('peta-range-dropdown');
    var btn = G('btn-peta-minggu');
    if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
        dd.style.display = 'none';
    }
});

function _toggleRangeDropdown(e) {
    e.stopPropagation();
    var dd = G('peta-range-dropdown');
    if (!dd) return;
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function _setProtoRange(mode) {
    _petaProtoFilterMode = mode;
    var dd = G('peta-range-dropdown');
    if (dd) dd.style.display = 'none';

    // Reset date pill (hapus tanggal manual)
    var input = G('peta-date-filter');
    if (input) input.value = '';
    var pill = G('peta-date-pill');
    if (pill) pill.classList.remove('active');

    // Update label tombol dropdown — tampilkan tanggal nyata
    var labelEl = G('peta-range-label');
    var dropLabel = _buildDatePillLabel(mode);
    if (labelEl) labelEl.textContent = dropLabel;

    // Update label date pill — tampilkan tanggal/rentang nyata
    var display = G('peta-date-display');
    if (display) display.textContent = _buildDatePillLabel(mode);

    // Update highlight opsi aktif
    ['today', 'tomorrow', 'week'].forEach(function (m) {
        var opt = G('peta-ropt-' + m);
        if (!opt) return;
        if (m === mode) {
            opt.style.background = 'rgba(30,111,217,.08)';
            opt.style.color = '#1e6fd9';
            opt.style.fontWeight = '700';
        } else {
            opt.style.background = 'none';
            opt.style.color = 'var(--text,#1e293b)';
            opt.style.fontWeight = '600';
        }
    });

    refreshLeaflet();
}

// Alias untuk kompatibilitas
function _setPetaRangeMinggu() { _setProtoRange('week'); }

function _openDatePicker() {
    var input = G('peta-date-filter');
    if (!input) return;
    try {
        input.focus();
        if (input.showPicker) input.showPicker();
        else input.click();
    } catch (e) { input.focus(); }
}

function _onDateChange(input) {
    var display = G('peta-date-display');
    var pill = G('peta-date-pill');
    var labelEl = G('peta-range-label');
    var today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Reset highlight semua opsi dropdown
    ['today', 'tomorrow', 'week'].forEach(function (m) {
        var opt = G('peta-ropt-' + m);
        if (opt) { opt.style.background = 'none'; opt.style.color = 'var(--text,#1e293b)'; opt.style.fontWeight = '600'; }
    });

    if (input && input.value) {
        _petaProtoFilterMode = 'date';
        var text = _fmtShort(input.value);
        if (display) display.textContent = text;
        if (labelEl) labelEl.textContent = text;
        if (pill) pill.classList.add('active');
        // Highlight "Tanggal" di dropdown jika tanggal = hari ini
        if (input.value === today) {
            var optToday = G('peta-ropt-today');
            if (optToday) { optToday.style.background = 'rgba(30,111,217,.08)'; optToday.style.color = '#1e6fd9'; optToday.style.fontWeight = '700'; }
        }
    } else {
        _petaProtoFilterMode = 'today';
        if (pill) pill.classList.remove('active');
        var todayLabel = _buildDatePillLabel('today');
        if (display) display.textContent = todayLabel;
        if (labelEl) labelEl.textContent = 'Tanggal';
        // Highlight "Tanggal" di dropdown
        var optToday2 = G('peta-ropt-today');
        if (optToday2) { optToday2.style.background = 'rgba(30,111,217,.08)'; optToday2.style.color = '#1e6fd9'; optToday2.style.fontWeight = '700'; }
    }
    refreshLeaflet();
}

function _clearDate() {
    _petaProtoFilterMode = 'today';
    var input = G('peta-date-filter');
    if (input) {
        input.value = '';
        _onDateChange(input);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  16. LOADER
// ─────────────────────────────────────────────────────────────────────────────
function _lfShowLoad(msg) {
    var el = G('lf-loader');
    var sp = el && el.querySelector('span');
    if (sp) sp.textContent = msg || 'Memuat...';
    if (el) el.style.display = 'flex';
}

function _lfHideLoad() {
    var el = G('lf-loader');
    if (el) el.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
//  17. SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
var _sidebarCollapsed = false;

function _toggleSidebar() {
    var sb = G('peta-sidebar');
    var toggle = G('sidebar-toggle');
    var ico = G('sidebar-toggle-ico');
    if (!sb) return;
    _sidebarCollapsed = !_sidebarCollapsed;
    if (_sidebarCollapsed) {
        sb.classList.add('collapsed');
        if (ico) ico.className = 'bi bi-chevron-right';
        if (toggle) toggle.classList.remove('sb-open');
    } else {
        sb.classList.remove('collapsed');
        if (ico) ico.className = 'bi bi-chevron-left';
        if (toggle) toggle.classList.add('sb-open');
    }
    setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 300);
}

function _toggleSidebarMobile() {
    var sb = G('peta-sidebar');
    if (!sb) return;
    var isOpen = sb.classList.contains('mobile-open');
    if (isOpen) {
        sb.classList.remove('mobile-open');
        var bd = G('peta-proto-sb-backdrop');
        if (bd) bd.remove();
    } else {
        sb.classList.add('mobile-open');
        sb.classList.remove('collapsed');
        // Backdrop untuk tutup saat klik di luar
        var bd = document.createElement('div');
        bd.id = 'peta-proto-sb-backdrop';
        bd.style.cssText = 'position:absolute;inset:0;z-index:1199;background:rgba(0,0,0,.3)';
        bd.onclick = function () { _toggleSidebarMobile(); };
        var area = G('peta-map-area');
        if (area) area.appendChild(bd);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  17b. SIDEBAR AUTO TOGGLE (desktop & mobile unified)
// ─────────────────────────────────────────────────────────────────────────────
function _toggleSidebarAuto() {
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
        _toggleSidebarMobile();
        // Update icon
        var ico = G('peta-sb-tog-ico');
        var sb = G('peta-sidebar');
        if (ico && sb) {
            var isOpen = sb.classList.contains('mobile-open');
            ico.className = isOpen ? 'bi bi-layout-sidebar' : 'bi bi-x-lg';
        }
    } else {
        _toggleSidebar();
        // Update icon
        var ico2 = G('peta-sb-tog-ico');
        if (ico2) ico2.className = _sidebarCollapsed ? 'bi bi-layout-sidebar-reverse' : 'bi bi-layout-sidebar';
    }
}

function _checkMobileLayout() {
    var mobileBtn = G('peta-sidebar-toggle-btn');
    var sidebarToggle = G('sidebar-toggle');
    var sidebarClose = G('peta-sidebar-header') && G('peta-sidebar-header').querySelector('.sidebar-close');
    var isMobile = window.innerWidth <= 768;

    if (mobileBtn) {
        // Selalu tampilkan di topbar — atur ikon berdasarkan state
        mobileBtn.style.display = 'flex';
    }
    if (sidebarToggle) {
        // Sembunyikan strip vertikal — digantikan tombol di topbar
        sidebarToggle.style.display = 'none';
    }

    var sb = G('peta-sidebar');
    if (isMobile) {
        // Mobile: sidebar jadi overlay, tutup jika sedang terbuka
        if (sb) {
            sb.classList.remove('mobile-open');
            var bd = G('peta-proto-sb-backdrop');
            if (bd) bd.remove();
        }
        if (sidebarClose) sidebarClose.style.display = 'flex';
    } else {
        // Desktop: sidebar normal, tampilkan jika tidak collapsed
        if (sb && !_sidebarCollapsed) {
            sb.classList.remove('collapsed');
        }
        if (sidebarClose) sidebarClose.style.display = 'none';
        setTimeout(function () { if (_lfMap) _lfMap.invalidateSize({ animate: false }); }, 50);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  19. ESC KEY
// ─────────────────────────────────────────────────────────────────────────────
function _onKeyEsc(e) {
    if (e.key !== 'Escape') return;
    if (_navPanelOpen) { _toggleNavPanel(); return; }
    if (_petaFullscreen) { togglePetaFullscreen(); }
}

