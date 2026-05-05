// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
// State kalender dashboard
const DASH_CAL = { year: 0, month: 0, agendaData: [] };

async function loadDashboard() {
  try {
    const res = await callAPI('getDashboard', {});
    if (res.success) {
      animateCount('stat-masuk', res.suratMasuk || 0);
      animateCount('stat-arsip-dokumen', res.arsip || 0);
      animateCount('stat-agenda', res.agenda || 0);
      animateCount('stat-agenda-hari-ini', res.agendaHariIni || 0);
      animateCount('stat-agenda-besok', res.agendaBesok || 0);
      animateCount('stat-agenda-minggu', res.agendaMingguIni || 0);
      animateCount('stat-disposisi', res.disposisi || 0);
      // Total Arsip = Surat Masuk + Dokumen Arsip
      animateCount('stat-arsip', (res.suratMasuk || 0) + (res.arsip || 0));
    }
  } catch (err) {
    console.warn('Dashboard load silent fail:', err);
  }
  // Load kalender agenda
  loadDashboardCalendar();
}

async function loadDashboardCalendar() {
  const now = new Date();
  if (!DASH_CAL.year) { DASH_CAL.year = now.getFullYear(); DASH_CAL.month = now.getMonth(); }
  try {
    const res = await callAPI('getAgenda', {});
    DASH_CAL.agendaData = (res.success ? res.data : []);
  } catch (e) { DASH_CAL.agendaData = []; }
  renderDashCalendar();
}

function dashCalPrev() {
  DASH_CAL.month--;
  if (DASH_CAL.month < 0) { DASH_CAL.month = 11; DASH_CAL.year--; }
  renderDashCalendar();
}
function dashCalNext() {
  DASH_CAL.month++;
  if (DASH_CAL.month > 11) { DASH_CAL.month = 0; DASH_CAL.year++; }
  renderDashCalendar();
}
function dashCalToday() {
  const now = new Date();
  DASH_CAL.year = now.getFullYear();
  DASH_CAL.month = now.getMonth();
  renderDashCalendar();
}

function renderDashCalendar() {
  const calEl = document.getElementById('dash-calendar');
  const labelEl = document.getElementById('dash-cal-label');
  if (!calEl) return;

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const { year, month, agendaData } = DASH_CAL;

  if (labelEl) labelEl.textContent = BULAN[month] + ' ' + year;

  // Buat map tanggal → agenda
  const agendaMap = {};
  agendaData.forEach(function (d) {
    const tgl = (d['Tanggal'] || '').substring(0, 10);
    if (!tgl) return;
    if (!agendaMap[tgl]) agendaMap[tgl] = [];
    agendaMap[tgl].push(d);
  });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  let html = '<div class="dash-cal-grid">';
  // Header hari
  HARI_SINGKAT.forEach(function (h) {
    html += '<div class="dash-cal-hdr">' + h + '</div>';
  });
  // Padding awal
  for (let i = 0; i < firstDay; i++) html += '<div class="dash-cal-cell empty"></div>';
  // Isi tanggal
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const items = agendaMap[dateStr] || [];
    const isToday = dateStr === todayStr;
    const hasAgenda = items.length > 0;
    const statusColors = items.map(function (a) {
      const s = a['Status Kehadiran'] || 'Hadir';
      return s === 'Hadir' ? '#16a34a' : (s === 'Disposisi' ? '#b45309' : '#e11d48');
    });
    const dots = statusColors.slice(0, 3).map(function (c) {
      return '<span style="width:6px;height:6px;border-radius:50%;background:' + c + ';display:inline-block"></span>';
    }).join('');

    html += '<div class="dash-cal-cell' + (isToday ? ' today' : '') + (hasAgenda ? ' has-agenda' : '') + '"' +
      (hasAgenda ? ' onclick="openAgendaDetailModal(\'' + dateStr + '\')" title="' + items.length + ' agenda"' : '') + '>' +
      '<span class="dash-cal-num">' + d + '</span>' +
      (hasAgenda ? '<div class="dash-cal-dots">' + dots + (items.length > 3 ? '<span style="font-size:.55rem;color:var(--text-muted)">+' + (items.length - 3) + '</span>' : '') + '</div>' : '') +
      '</div>';
  }
  html += '</div>';
  calEl.innerHTML = html;
}

function openAgendaDetailModal(dateStr) {
  const items = DASH_CAL.agendaData.filter(function (d) { return (d['Tanggal'] || '').substring(0, 10) === dateStr; });
  if (!items.length) return;

  const modal = document.getElementById('agenda-detail-modal');
  const titleEl = document.getElementById('agenda-detail-title');
  const dateEl = document.getElementById('agenda-detail-date');
  const contentEl = document.getElementById('agenda-detail-content');
  if (!modal) return;

  const d = new Date(dateStr + 'T00:00:00');
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  titleEl.textContent = items.length + ' Agenda';
  dateEl.textContent = HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();

  contentEl.innerHTML = items.map(function (ag, i) {
    const status = ag['Status Kehadiran'] || 'Hadir';
    const statusColor = status === 'Hadir' ? '#16a34a' : (status === 'Disposisi' ? '#b45309' : '#e11d48');
    const statusIcon = status === 'Hadir' ? 'check-circle-fill' : (status === 'Disposisi' ? 'arrow-right-circle-fill' : 'x-circle-fill');
    const safeData = encodeURIComponent(JSON.stringify(ag));

    let filesHtml = '';
    if (ag['URL'] && ag['URL'] !== '-' && ag['URL'] !== '') {
      filesHtml += '<button onclick="openFileViewer(\'' + esc(ag['URL']) + '\',\'' + esc(ag['Nama File'] || 'Lampiran') + '\')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#10b98111;color:#10b981;border:1px solid #10b98133;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-paperclip"></i> Lampiran</button> ';
    }
    if (ag['URL Sambutan'] && ag['URL Sambutan'] !== '') {
      filesHtml += '<button onclick="openFileViewer(\'' + esc(ag['URL Sambutan']) + '\',\'Sambutan\')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#3b82f611;color:#3b82f6;border:1px solid #3b82f633;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-file-text"></i> Sambutan</button> ';
    }
    if (ag['URL Sapaan'] && ag['URL Sapaan'] !== '') {
      filesHtml += '<button onclick="openFileViewer(\'' + esc(ag['URL Sapaan']) + '\',\'Sapaan\')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#8b5cf611;color:#8b5cf6;border:1px solid #8b5cf633;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-people"></i> Sapaan</button>';
    }

    return '<div style="border:1px solid var(--border);border-left:4px solid ' + statusColor + ';border-radius:10px;padding:14px;margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">' +
      '<div style="font-weight:700;font-size:.92rem;color:var(--text-main)">' + (i + 1) + '. ' + esc(ag['Nama Kegiatan'] || '-') + '</div>' +
      '<span style="font-size:.72rem;color:' + statusColor + ';background:' + statusColor + '22;padding:2px 8px;border-radius:20px;white-space:nowrap;display:flex;align-items:center;gap:4px;flex-shrink:0"><i class="bi bi-' + statusIcon + '"></i> ' + esc(status) + '</span>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:.8rem;color:var(--text-muted);margin-bottom:8px">' +
      (ag['Waktu'] && ag['Waktu'] !== '-' ? '<span><i class="bi bi-clock"></i> ' + esc(ag['Waktu']) + '</span>' : '') +
      (ag['Lokasi'] && ag['Lokasi'] !== '-' ? '<span><i class="bi bi-geo-alt"></i> ' + esc(ag['Lokasi']) + '</span>' : '') +
      (ag['Pakaian'] && ag['Pakaian'] !== '-' ? '<span><i class="bi bi-person-bounding-box"></i> ' + esc(ag['Pakaian']) + '</span>' : '') +
      (ag['Transit'] && ag['Transit'] !== '-' ? '<span><i class="bi bi-signpost-2"></i> ' + esc(ag['Transit']) + '</span>' : '') +
      '</div>' +
      (ag['Keterangan'] && ag['Keterangan'] !== '-' ? '<div style="font-size:.78rem;color:var(--text-muted);font-style:italic;margin-bottom:8px">' + esc(ag['Keterangan']) + '</div>' : '') +
      (ag['CP Nama'] ? '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px"><i class="bi bi-person-circle"></i> CP: <strong>' + esc(ag['CP Nama']) + '</strong>' + (ag['CP No WA'] ? ' · ' + esc(String(ag['CP No WA']).replace(/^'/, '')) : '') + '</div>' : '') +
      (filesHtml ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' + filesHtml + '</div>' : '') +
      '<div style="display:flex;gap:6px;justify-content:flex-end">' +
      '<button onclick="closeAgendaDetailModal();navigateToAgendaDate(\'' + dateStr + '\')" style="padding:4px 10px;font-size:.75rem;background:var(--primary);color:#fff;border:none;border-radius:6px;cursor:pointer"><i class="bi bi-arrow-right"></i> Lihat di Agenda</button>' +
      '<button onclick="closeAgendaDetailModal();openEditModal(\'Agenda\',\'' + safeData + '\')" style="padding:4px 10px;font-size:.75rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer"><i class="bi bi-pencil"></i> Edit</button>' +
      '</div>' +
      '</div>';
  }).join('');

  modal.style.display = 'flex';
}

function closeAgendaDetailModal() {
  const modal = document.getElementById('agenda-detail-modal');
  if (modal) modal.style.display = 'none';
  unlockScroll();
}

// ══════════════════════════════════════════════════════════
//  ARSIP MODAL — ringkasan dari card Total Arsip
// ══════════════════════════════════════════════════════════
function openArsipModal() {
  // Ambil nilai terkini dari DOM (sudah diisi oleh loadDashboard)
  const totalMasuk  = document.getElementById('stat-masuk')  ? document.getElementById('stat-masuk').textContent  : '—';
  const totalDokumen = document.getElementById('stat-arsip-dokumen') ? document.getElementById('stat-arsip-dokumen').textContent : '—';
  const totalArsip  = document.getElementById('stat-arsip')  ? document.getElementById('stat-arsip').textContent  : '—';

  // Hapus modal lama jika ada
  const old = document.getElementById('arsip-summary-modal');
  if (old) old.remove();

  const dlg = document.createElement('div');
  dlg.id = 'arsip-summary-modal';
  dlg.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
  dlg.innerHTML =
    '<div style="background:var(--card-bg,#fff);border-radius:20px;padding:28px 24px;width:min(420px,96vw);box-shadow:0 24px 80px rgba(0,0,0,.4);border:1px solid var(--border)">' +

    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
    '<div style="display:flex;align-items:center;gap:10px">' +
    '<div style="width:40px;height:40px;border-radius:12px;background:rgba(8,145,178,.12);display:flex;align-items:center;justify-content:center">' +
    '<i class="bi bi-folder-fill" style="color:#0891b2;font-size:1.1rem"></i></div>' +
    '<div><div style="font-weight:800;font-size:1rem;color:var(--text-main)">Arsip Digital</div>' +
    '<div style="font-size:.75rem;color:var(--text-muted)">Total ' + totalArsip + ' dokumen tersimpan</div></div>' +
    '</div>' +
    '<button onclick="document.getElementById(\'arsip-summary-modal\').remove()" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--text-muted);font-size:1.1rem;display:flex;align-items:center;justify-content:center"><i class="bi bi-x"></i></button>' +
    '</div>' +

    // Dua card klik
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">' +

    // Card Surat Masuk
    '<button onclick="document.getElementById(\'arsip-summary-modal\').remove();navigateTo(\'surat-masuk\')" ' +
    'style="background:var(--body-bg,#f0f4f8);border:1.5px solid var(--border);border-radius:14px;padding:18px 14px;cursor:pointer;text-align:left;transition:all .18s;font-family:inherit" ' +
    'onmouseover="this.style.borderColor=\'#0891b2\';this.style.background=\'rgba(8,145,178,.06)\'" ' +
    'onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--body-bg,#f0f4f8)\'">' +
    '<div style="width:36px;height:36px;border-radius:10px;background:rgba(8,145,178,.12);display:flex;align-items:center;justify-content:center;margin-bottom:10px">' +
    '<i class="bi bi-envelope-arrow-down-fill" style="color:#0891b2;font-size:1rem"></i></div>' +
    '<div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1;margin-bottom:4px">' + totalMasuk + '</div>' +
    '<div style="font-size:.75rem;font-weight:600;color:var(--text-muted)">Surat Masuk</div>' +
    '<div style="font-size:.68rem;color:#0891b2;margin-top:6px;display:flex;align-items:center;gap:4px"><i class="bi bi-arrow-right-circle-fill"></i> Buka menu</div>' +
    '</button>' +

    // Card Dokumen Arsip
    '<button onclick="document.getElementById(\'arsip-summary-modal\').remove();navigateTo(\'arsip-dokumen\')" ' +
    'style="background:var(--body-bg,#f0f4f8);border:1.5px solid var(--border);border-radius:14px;padding:18px 14px;cursor:pointer;text-align:left;transition:all .18s;font-family:inherit" ' +
    'onmouseover="this.style.borderColor=\'#0f4c81\';this.style.background=\'rgba(15,76,129,.06)\'" ' +
    'onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--body-bg,#f0f4f8)\'">' +
    '<div style="width:36px;height:36px;border-radius:10px;background:rgba(15,76,129,.12);display:flex;align-items:center;justify-content:center;margin-bottom:10px">' +
    '<i class="bi bi-folder-fill" style="color:#0f4c81;font-size:1rem"></i></div>' +
    '<div style="font-size:1.6rem;font-weight:900;color:var(--text-main);line-height:1;margin-bottom:4px">' + totalDokumen + '</div>' +
    '<div style="font-size:.75rem;font-weight:600;color:var(--text-muted)">Dokumen Arsip</div>' +
    '<div style="font-size:.68rem;color:#0f4c81;margin-top:6px;display:flex;align-items:center;gap:4px"><i class="bi bi-arrow-right-circle-fill"></i> Buka menu</div>' +
    '</button>' +

    '</div>' +

    // Tombol tutup
    '<button onclick="document.getElementById(\'arsip-summary-modal\').remove()" ' +
    'style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-muted);font-size:.88rem;font-weight:600;cursor:pointer;font-family:inherit">Tutup</button>' +
    '</div>';

  dlg.addEventListener('click', function(e) { if (e.target === dlg) dlg.remove(); });
  document.body.appendChild(dlg);
}

/**
 * Navigasi ke halaman agenda dan filter ke tanggal tertentu
 */
function navigateToAgendaDate(dateStr) {
  navigateTo('agenda');
  // Tunggu halaman agenda render, lalu filter ke tanggal
  setTimeout(function() {
    const agendaData = (typeof _agendaSearchCache !== 'undefined' ? _agendaSearchCache : []);
    const filtered = agendaData.filter(function(d) {
      return (d['Tanggal'] || '').substring(0, 10) === dateStr;
    });
    if (typeof renderAgendaTimeline === 'function') {
      renderAgendaTimeline(filtered.length ? filtered : agendaData);
    }
    // Scroll ke atas
    const timeline = document.getElementById('agenda-timeline');
    if (timeline) timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
}

/**
 * Buka modal agenda dari dashboard card (hari ini / besok / minggu ini)
 */
function openDashAgendaModal(range) {
  const data = DASH_CAL.agendaData || [];
  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayStr = wibNow.toISOString().split('T')[0];
  const tomorrowStr = new Date(wibNow.getTime() + 86400000).toISOString().split('T')[0];
  const weekEndStr = new Date(wibNow.getTime() + 6 * 86400000).toISOString().split('T')[0];

  let items, title, subtitle;
  if (range === 'today') {
    items = data.filter(d => (d['Tanggal'] || '').substring(0, 10) === todayStr);
    title = 'Agenda Hari Ini';
    const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const dt = new Date(todayStr + 'T00:00:00');
    subtitle = HARI[dt.getDay()] + ', ' + dt.getDate() + ' ' + BULAN[dt.getMonth()] + ' ' + dt.getFullYear();
  } else if (range === 'tomorrow') {
    items = data.filter(d => (d['Tanggal'] || '').substring(0, 10) === tomorrowStr);
    title = 'Agenda Besok';
    const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const dt = new Date(tomorrowStr + 'T00:00:00');
    subtitle = HARI[dt.getDay()] + ', ' + dt.getDate() + ' ' + BULAN[dt.getMonth()] + ' ' + dt.getFullYear();
  } else {
    items = data.filter(d => {
      const tgl = (d['Tanggal'] || '').substring(0, 10);
      return tgl >= todayStr && tgl <= weekEndStr;
    });
    title = 'Agenda Minggu Ini';
    subtitle = '7 hari ke depan · ' + items.length + ' agenda';
  }

  if (!items.length) {
    showToast('Tidak ada agenda untuk periode ini.', 'info');
    return;
  }

  const modal = document.getElementById('agenda-detail-modal');
  const titleEl = document.getElementById('agenda-detail-title');
  const dateEl = document.getElementById('agenda-detail-date');
  const contentEl = document.getElementById('agenda-detail-content');
  if (!modal) return;

  titleEl.textContent = title + ' (' + items.length + ')';
  dateEl.textContent = subtitle;

  // Untuk range 'week': kelompokkan per hari/tanggal
  if (range === 'week') {
    const HARI_W  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const BULAN_W = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const groups = {};
    items.forEach(function(ag) {
      const tgl = (ag['Tanggal'] || '').substring(0, 10);
      if (!groups[tgl]) groups[tgl] = [];
      groups[tgl].push(ag);
    });
    const sortedDates = Object.keys(groups).sort();

    contentEl.innerHTML = sortedDates.map(function(tgl) {
      const dayItems = groups[tgl];
      const dt = new Date(tgl + 'T00:00:00');
      const isToday    = tgl === todayStr;
      const isTomorrow = tgl === tomorrowStr;
      const dayLabel = HARI_W[dt.getDay()] + ', ' + dt.getDate() + ' ' + BULAN_W[dt.getMonth()] + ' ' + dt.getFullYear();
      const dayBadge = isToday
        ? ' <span style="font-size:.62rem;background:#16a34a;color:#fff;padding:2px 7px;border-radius:10px;margin-left:6px;vertical-align:middle">Hari Ini</span>'
        : isTomorrow
        ? ' <span style="font-size:.62rem;background:#1e6fd9;color:#fff;padding:2px 7px;border-radius:10px;margin-left:6px;vertical-align:middle">Besok</span>'
        : '';

      const cardsHtml = dayItems.map(function(ag) {
        return _renderDashAgendaCard(ag, 0);
      }).join('');

      return '<div style="margin-bottom:18px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--border)">' +
        '<i class="bi bi-calendar3-fill" style="color:var(--primary);font-size:.88rem;flex-shrink:0"></i>' +
        '<span style="font-weight:800;font-size:.88rem;color:var(--text-main)">' + dayLabel + dayBadge + '</span>' +
        '<span style="margin-left:auto;font-size:.7rem;color:var(--text-muted);background:var(--body-bg);padding:2px 8px;border-radius:10px;border:1px solid var(--border);white-space:nowrap">' + dayItems.length + ' agenda</span>' +
        '</div>' +
        cardsHtml +
        '</div>';
    }).join('');
  } else {
    // today / tomorrow: flat list
    contentEl.innerHTML = items.map(function(ag, i) {
      return _renderDashAgendaCard(ag, i + 1);
    }).join('');
  }

  modal.style.display = 'flex';
  lockScroll();
}

// Helper: render satu card agenda di dalam modal dashboard
function _renderDashAgendaCard(ag, num) {
  const status = ag['Status Kehadiran'] || 'Hadir';
  const statusColor = status === 'Hadir' ? '#16a34a' : (status === 'Disposisi' ? '#b45309' : '#e11d48');
  const statusIcon  = status === 'Hadir' ? 'check-circle-fill' : (status === 'Disposisi' ? 'arrow-right-circle-fill' : 'x-circle-fill');
  const safeData = encodeURIComponent(JSON.stringify(ag));

  let filesHtml = '';
  if (ag['URL'] && ag['URL'] !== '-') filesHtml += '<button onclick="openFileViewer(\'' + esc(ag['URL']) + '\',\'' + esc(ag['Nama File'] || 'Lampiran') + '\')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#10b98111;color:#10b981;border:1px solid #10b98133;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-paperclip"></i> Lampiran</button> ';
  if (ag['URL Sambutan']) filesHtml += '<button onclick="openFileViewer(\'' + esc(ag['URL Sambutan']) + '\',\'Sambutan\')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#3b82f611;color:#3b82f6;border:1px solid #3b82f633;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-file-text"></i> Sambutan</button> ';
  if (ag['URL Sapaan']) filesHtml += '<button onclick="openFileViewer(\'' + esc(ag['URL Sapaan']) + '\',\'Sapaan\')" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#8b5cf611;color:#8b5cf6;border:1px solid #8b5cf633;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="bi bi-people"></i> Sapaan</button>';

  let cpHtml = '';
  if (ag['CP Nama']) {
    const cpWaRaw = String(ag['CP No WA'] || '').replace(/^'+/, '').trim();
    let cpWaLink = '';
    if (cpWaRaw) {
      let cpNum = cpWaRaw.replace(/\D/g, '');
      if (cpNum.startsWith('0')) cpNum = '62' + cpNum.substring(1);
      cpWaLink = ' · <a href="https://wa.me/' + cpNum + '" target="_blank" style="color:#25D366;font-weight:700;text-decoration:none"><i class="bi bi-whatsapp"></i> ' + esc(cpWaRaw) + '</a>';
    }
    cpHtml = '<div style="font-size:.78rem;color:var(--text-muted);margin-bottom:5px"><i class="bi bi-person-circle"></i> CP: <strong>' + esc(ag['CP Nama']) + '</strong>' + cpWaLink + '</div>';
  }

  const namePrefix = num ? (num + '. ') : '';

  return '<div style="border:1px solid var(--border);border-left:4px solid ' + statusColor + ';border-radius:10px;padding:12px 14px;margin-bottom:8px">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:5px">' +
    '<div style="font-weight:700;font-size:.9rem;color:var(--text-main)">' + namePrefix + esc(ag['Nama Kegiatan'] || '-') + '</div>' +
    '<span style="font-size:.68rem;color:' + statusColor + ';background:' + statusColor + '22;padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0"><i class="bi bi-' + statusIcon + '"></i> ' + esc(status) + '</span>' +
    '</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:.78rem;color:var(--text-muted);margin-bottom:5px">' +
    (ag['Waktu'] && ag['Waktu'] !== '-' ? '<span><i class="bi bi-clock"></i> ' + esc(ag['Waktu']) + '</span>' : '') +
    (ag['Lokasi'] && ag['Lokasi'] !== '-' ? '<span><i class="bi bi-geo-alt"></i> ' + esc(ag['Lokasi']) + '</span>' : '') +
    (ag['Pakaian'] && ag['Pakaian'] !== '-' ? '<span><i class="bi bi-person-bounding-box"></i> ' + esc(ag['Pakaian']) + '</span>' : '') +
    '</div>' +
    cpHtml +
    (ag['Keterangan'] && ag['Keterangan'] !== '-' ? '<div style="font-size:.75rem;color:var(--text-muted);font-style:italic;margin-bottom:5px">' + esc(ag['Keterangan']) + '</div>' : '') +
    (filesHtml ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">' + filesHtml + '</div>' : '') +
    '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:4px">' +
    '<button onclick="closeAgendaDetailModal();navigateToAgendaDate(\'' + (ag['Tanggal'] || '').substring(0,10) + '\')" style="padding:4px 10px;font-size:.72rem;background:var(--primary);color:#fff;border:none;border-radius:6px;cursor:pointer"><i class="bi bi-arrow-right"></i> Lihat</button>' +
    '<button onclick="closeAgendaDetailModal();openEditModal(\'Agenda\',\'' + safeData + '\')" style="padding:4px 10px;font-size:.72rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer"><i class="bi bi-pencil"></i> Edit</button>' +
    '</div>' +
    '</div>';
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(function () {
    start = Math.min(start + step, target);
    el.textContent = start;
    if (start >= target) clearInterval(timer);
  }, 20);
}

