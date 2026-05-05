// ══════════════════════════════════════════════════════════
//  CETAK LAPORAN 
// ══════════════════════════════════════════════════════════
function printPage() {
  const currentPage = APP.currentPage;
  let title = 'Laporan Dokumen';
  let tableIdStr = '';

  if (currentPage === 'arsip') {
    title = 'LAPORAN REKAPITULASI ARSIP DOKUMEN'; tableIdStr = 'arsip-table';
  } else if (currentPage === 'surat-masuk') {
    title = 'LAPORAN REKAPITULASI SURAT MASUK'; tableIdStr = 'table-sm';
  } else if (currentPage === 'agenda') {
    openPrintAgendaDialog();
    return;
  } else if (currentPage === 'disposisi') {
    title = 'LAPORAN REKAPITULASI DISPOSISI'; tableIdStr = 'table-disp';
  } else {
    showToast('Tidak ada data yang dapat dicetak pada halaman ini.', 'error'); return;
  }

  const tableEl = document.getElementById(tableIdStr);
  if (!tableEl) { showToast('Tabel tidak ditemukan.', 'error'); return; }

  const clone = tableEl.cloneNode(true);
  const thr = clone.querySelector('thead tr');

  // Hapus kolom Lampiran (sebelum kolom Aksi) dan kolom Aksi dari print
  // Strategi: hapus 2 kolom terakhir dari thead, dan 2 td terakhir dari setiap tr
  function removeLastNCols(trEl, n) {
    for (let i = 0; i < n; i++) {
      if (trEl.lastElementChild) trEl.removeChild(trEl.lastElementChild);
    }
  }

  // Tentukan berapa kolom yang dihapus: Lampiran + Aksi = 2 untuk surat masuk & arsip
  // Untuk disposisi: hanya Aksi = 1
  const colsToRemove = (currentPage === 'arsip' || currentPage === 'surat-masuk') ? 2 : 1;

  if (thr) removeLastNCols(thr, colsToRemove);
  clone.querySelectorAll('tbody tr').forEach(function (tr) {
    if (!tr.classList.contains('no-data')) removeLastNCols(tr, colsToRemove);
  });

  const k1 = localStorage.getItem('senapati_kop1') || 'PEMERINTAH KABUPATEN PONOROGO';
  const k2 = localStorage.getItem('senapati_kop2') || 'BUPATI PONOROGO';
  const k3 = localStorage.getItem('senapati_kop3') || 'Jl. Alun-Alun Utara No. 1, Ponorogo';
  const kTelp = localStorage.getItem('senapati_kop_telp') || '';
  const logoKiri = localStorage.getItem('senapati_logo_kiri_data') || '';
  const logoKanan = localStorage.getItem('senapati_logo_kanan_data') || '';
  const logoKiriSize = localStorage.getItem('senapati_logo_kiri_size') || '70';
  const logoKananSize = localStorage.getItem('senapati_logo_kanan_size') || '70';
  const defaultLogo = BASE_URL + '/assets/icon-512.png';

  const leftImg = logoKiri ? ('<img src="' + logoKiri + '" style="width:' + logoKiriSize + 'px;margin-right:16px;">')
    : ('<img src="' + defaultLogo + '" style="width:70px;margin-right:16px;">');
  const rightImg = logoKanan ? ('<img src="' + logoKanan + '" style="width:' + logoKananSize + 'px;margin-left:16px;">') : '';

  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Buat modal print in-page (tidak buka tab baru)
  _openPrintModal(title, now, leftImg, rightImg, k1, k2, k3, kTelp, clone.outerHTML);
}

// ── Helper: tampilkan modal cetak in-page ──
function _openPrintModal(title, now, leftImg, rightImg, k1, k2, k3, kTelp, tableHtmlOrFullDoc, isFullDoc) {
  const old = document.getElementById('print-preview-modal');
  if (old) { old.remove(); unlockScroll(); }

  let srcdoc;
  if (isFullDoc) {
    // tableHtmlOrFullDoc sudah berupa dokumen HTML lengkap
    srcdoc = tableHtmlOrFullDoc;
  } else {
    srcdoc = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>${title} - SENAPATI</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; padding: 0; margin: 15mm; color: #000; font-size: 10pt; }
  .kop { display: flex; align-items: center; justify-content: center; border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 2px; }
  .kop-border { border-top: 1px solid #000; margin-bottom: 16px; }
  .kop-text { text-align: center; line-height: 1.2; flex: 1; }
  .kop-text h2 { margin: 0; font-size: 12pt; font-weight: normal; }
  .kop-text h1 { margin: 3px 0; font-size: 16pt; font-weight: bold; }
  .kop-text p { margin: 0; font-size: 9pt; }
  .title { text-align: center; margin-bottom: 14px; }
  .title h3 { margin: 0; font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; }
  .title p { font-size: 9pt; margin: 4px 0 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { border: 1px solid #000; padding: 6px 8px; text-align: center; background: #e8e8e8; font-weight: bold; white-space: nowrap; }
  td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; word-break: break-word; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style></head><body>
<div class="kop">${leftImg}<div class="kop-text"><h2>${k1}</h2><h1>${k2}</h1><p>${k3}${kTelp ? ' &mdash; Telp: ' + kTelp : ''}</p></div>${rightImg}</div>
<div class="kop-border"></div>
<div class="title"><h3>${title}</h3><p>Dicetak pada: ${now}</p></div>
${tableHtmlOrFullDoc}
</body></html>`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'print-preview-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(0,0,0,.75);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px';

  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;overflow:hidden;width:min(96vw,1100px);height:min(92vh,800px);display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.5)';

  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#0f172a;color:#f1f5f9;flex-shrink:0;gap:8px;flex-wrap:wrap';
  toolbar.innerHTML = '<span style="font-size:.88rem;font-weight:700;display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="bi bi-printer-fill" style="color:#60a5fa;flex-shrink:0"></i>' + title + '</span>' +
    '<div style="display:flex;gap:8px;flex-shrink:0">' +
    '<button onclick="document.getElementById(\'print-preview-modal\').querySelector(\'iframe\').contentWindow.print()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer"><i class="bi bi-printer"></i> Cetak</button>' +
    '<button onclick="document.getElementById(\'print-preview-modal\').remove();unlockScroll()" style="display:flex;align-items:center;gap:5px;padding:7px 12px;background:rgba(220,38,38,.7);color:#fff;border:none;border-radius:8px;font-size:.82rem;cursor:pointer"><i class="bi bi-x-lg"></i> Tutup</button>' +
    '</div>';

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'flex:1;border:none;background:#fff;min-height:0';
  iframe.srcdoc = srcdoc;

  box.appendChild(toolbar);
  box.appendChild(iframe);
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { overlay.remove(); unlockScroll(); }
  });
  document.body.appendChild(overlay);
  lockScroll();
}

// ══════════════════════════════════════════════════════════
//  CETAK AGENDA — Dialog pilih bulan, output tabel rapi
// ══════════════════════════════════════════════════════════
function openPrintAgendaDialog() {
  // Hapus dialog lama jika ada
  const old = document.getElementById('print-agenda-dialog');
  if (old) old.remove();

  const now = new Date();
  const curYear  = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  // Opsi bulan
  let monthOpts = '';
  for (let m = 1; m <= 12; m++) {
    const sel = m === curMonth ? ' selected' : '';
    monthOpts += '<option value="' + m + '"' + sel + '>' + BULAN[m - 1] + '</option>';
  }

  // Opsi tahun: mulai 2026, 5 tahun ke depan
  const startYear = 2026;
  const endYear   = curYear + 5;
  let yearOpts = '';
  for (let y = startYear; y <= endYear; y++) {
    const sel = y === curYear ? ' selected' : '';
    yearOpts += '<option value="' + y + '"' + sel + '>' + y + '</option>';
  }

  const dlg = document.createElement('div');
  dlg.id = 'print-agenda-dialog';
  dlg.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
  dlg.innerHTML =
    '<div style="background:var(--card-bg,#fff);border-radius:16px;padding:28px 24px;width:min(420px,96vw);box-shadow:0 24px 80px rgba(0,0,0,.4);border:1px solid var(--border)">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">' +
    '<i class="bi bi-printer-fill" style="font-size:1.3rem;color:var(--primary)"></i>' +
    '<div><div style="font-weight:800;font-size:1rem;color:var(--text-main)">Cetak Agenda</div>' +
    '<div style="font-size:.78rem;color:var(--text-muted)">Pilih bulan dan tahun yang ingin dicetak</div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">' +
    // Kolom bulan
    '<div>' +
    '<label style="font-size:.78rem;font-weight:700;color:var(--text-main);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em"><i class="bi bi-calendar-month" style="color:var(--primary)"></i> Bulan</label>' +
    '<select id="print-agenda-month" class="form-control-custom" style="width:100%">' + monthOpts + '</select>' +
    '</div>' +
    // Kolom tahun
    '<div>' +
    '<label style="font-size:.78rem;font-weight:700;color:var(--text-main);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em"><i class="bi bi-calendar-year" style="color:var(--primary)"></i> Tahun</label>' +
    '<select id="print-agenda-year" class="form-control-custom" style="width:100%">' + yearOpts + '</select>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end">' +
    '<button onclick="document.getElementById(\'print-agenda-dialog\').remove()" style="padding:9px 18px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-muted);font-size:.88rem;font-weight:600;cursor:pointer;font-family:inherit">Batal</button>' +
    '<button onclick="doPrintAgenda()" style="padding:9px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--primary-lt));color:#fff;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:7px"><i class="bi bi-printer"></i> Cetak</button>' +
    '</div>' +
    '</div>';

  dlg.addEventListener('click', function(e) { if (e.target === dlg) dlg.remove(); });
  document.body.appendChild(dlg);
}

async function doPrintAgenda() {
  const selMonth = document.getElementById('print-agenda-month');
  const selYear  = document.getElementById('print-agenda-year');
  if (!selMonth || !selYear) return;
  const month = parseInt(selMonth.value, 10);
  const year  = parseInt(selYear.value, 10);
  document.getElementById('print-agenda-dialog').remove();

  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const monthStr = year + '-' + String(month).padStart(2, '0');
  const monthLabel = BULAN[month - 1] + ' ' + year;

  showSpinner('Menyiapkan data agenda...');
  let agendaData = [];
  try {
    const res = await callAPI('getAgenda', {});
    agendaData = (res.success ? res.data : []).filter(function(d) {
      return (d['Tanggal'] || '').startsWith(monthStr);
    });
  } catch(e) {
    hideSpinner();
    showToast('Gagal memuat data agenda: ' + e.message, 'error');
    return;
  }
  hideSpinner();

  // Kelompokkan per tanggal
  const groups = {};
  agendaData.forEach(function(d) {
    const tgl = (d['Tanggal'] || '').substring(0, 10);
    if (!tgl) return;
    if (!groups[tgl]) groups[tgl] = [];
    groups[tgl].push(d);
  });
  const sortedDates = Object.keys(groups).sort();

  // Kop surat
  const k1 = localStorage.getItem('senapati_kop1') || 'PEMERINTAH KABUPATEN PONOROGO';
  const k2 = localStorage.getItem('senapati_kop2') || 'BUPATI PONOROGO';
  const k3 = localStorage.getItem('senapati_kop3') || 'Jl. Alun-Alun Utara No. 1, Ponorogo';
  const kTelp = localStorage.getItem('senapati_kop_telp') || '';
  const logoKiri = localStorage.getItem('senapati_logo_kiri_data') || '';
  const logoKanan = localStorage.getItem('senapati_logo_kanan_data') || '';
  const logoKiriSize = localStorage.getItem('senapati_logo_kiri_size') || '70';
  const logoKananSize = localStorage.getItem('senapati_logo_kanan_size') || '70';
  const defaultLogo = BASE_URL + '/assets/icon-512.png';
  const leftImg = logoKiri
    ? '<img src="' + logoKiri + '" style="width:' + logoKiriSize + 'px;margin-right:16px">'
    : '<img src="' + defaultLogo + '" style="width:70px;margin-right:16px">';
  const rightImg = logoKanan
    ? '<img src="' + logoKanan + '" style="width:' + logoKananSize + 'px;margin-left:16px">'
    : '';

  // Build tabel rows
  let rowsHtml = '';
  let no = 1;
  if (!sortedDates.length) {
    rowsHtml = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#666;font-style:italic">Tidak ada agenda pada bulan ini</td></tr>';
  } else {
    sortedDates.forEach(function(tgl) {
      const items = groups[tgl];
      const dt = new Date(tgl + 'T00:00:00');
      const hariLabel = HARI[dt.getDay()] + ', ' + dt.getDate() + ' ' + BULAN[dt.getMonth()] + ' ' + dt.getFullYear();
      items.forEach(function(d, idx) {
        const status = d['Status Kehadiran'] || 'Hadir';
        const statusColor = status === 'Hadir' ? '#16a34a' : (status === 'Disposisi' ? '#b45309' : '#c0392b');
        rowsHtml +=
          '<tr>' +
          '<td style="text-align:center;white-space:nowrap">' + no + '</td>' +
          (idx === 0
            ? '<td rowspan="' + items.length + '" style="white-space:nowrap;font-weight:700;vertical-align:middle;background:#f5f7fa">' + hariLabel + '</td>'
            : '') +
          '<td>' + esc(d['Nama Kegiatan'] || '-') + '</td>' +
          '<td style="white-space:nowrap">' + esc(d['Waktu'] || '-') + '</td>' +
          '<td>' + esc(d['Lokasi'] || '-') + '</td>' +
          '<td>' + esc(d['Pakaian'] || '-') + '</td>' +
          '<td style="text-align:center;color:' + statusColor + ';font-weight:700;white-space:nowrap">' + esc(status) + '</td>' +
          '</tr>';
        no++;
      });
    });
  }

  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const agendaHtml = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Agenda ${monthLabel} - SENAPATI</title>
<style>
  @page { size: A4 portrait; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; font-size: 10pt; margin: 0; padding: 0; }
  .kop { display: flex; align-items: center; justify-content: center; border-bottom: 4px double #000; padding-bottom: 8px; margin-bottom: 2px; }
  .kop-border { border-top: 1px solid #000; margin-bottom: 14px; }
  .kop-text { text-align: center; line-height: 1.2; flex: 1; }
  .kop-text h2 { margin: 0; font-size: 11pt; font-weight: normal; }
  .kop-text h1 { margin: 3px 0; font-size: 15pt; font-weight: bold; letter-spacing: 1px; }
  .kop-text p  { margin: 0; font-size: 9pt; }
  .title { text-align: center; margin-bottom: 12px; }
  .title h3 { margin: 0 0 2px; font-size: 12pt; text-transform: uppercase; letter-spacing: 1px; text-decoration: underline; }
  .title p  { font-size: 9pt; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { border: 1px solid #000; padding: 5px 7px; text-align: center; background: #dde3ec; font-weight: bold; white-space: nowrap; }
  td { border: 1px solid #000; padding: 4px 7px; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .footer { margin-top: 14px; font-size: 8.5pt; color: #555; text-align: right; }
  @media print { table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style></head><body>
<div class="kop">${leftImg}<div class="kop-text"><h2>${k1}</h2><h1>${k2}</h1><p>${k3}${kTelp ? ' &mdash; Telp: ' + kTelp : ''}</p></div>${rightImg}</div>
<div class="kop-border"></div>
<div class="title"><h3>Agenda Kegiatan Bulan ${monthLabel}</h3><p>Dicetak pada: ${now}</p></div>
<table>
  <thead><tr>
    <th style="width:30px">No</th><th style="width:130px">Hari / Tanggal</th>
    <th>Nama Kegiatan</th><th style="width:90px">Waktu</th>
    <th style="width:130px">Lokasi</th><th style="width:90px">Pakaian</th><th style="width:70px">Status</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer">Total: ${no - 1} agenda &bull; SENAPATI &mdash; Sistem Agenda Bupati Ponorogo</div>
</body></html>`;

  _openPrintModal('Agenda ' + monthLabel, now, leftImg, rightImg, k1, k2, k3, kTelp, agendaHtml, true);
}


// ══════════════════════════════════════════════════════════
//  DELETE GENERIC
// ══════════════════════════════════════════════════════════
async function deleteItem(action, id, reloadFn) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  showSpinner('Menghapus data...');
  try {
    const res = await callAPI(action, { id: id });
    hideSpinner();
    if (res.success) { showToast(res.message, 'success'); if (reloadFn) reloadFn(); }
    else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

// ══════════════════════════════════════════════════════════
//  UI UTILS: TABS & PANELS
// ══════════════════════════════════════════════════════════
function setTab(tabId) {
  document.querySelectorAll('.custom-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function (c) { c.style.display = 'none'; });
  const tabMap = { 'tab-masuk': 'content-masuk', 'tab-keluar': 'content-keluar' };
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active');
  const content = tabMap[tabId];
  if (content) { const el = document.getElementById(content); if (el) el.style.display = 'block'; }
}

function togglePanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpening = el.style.display === 'none' || el.style.display === '';
  el.style.display = isOpening ? 'block' : 'none';
  // Re-init time picker saat panel dibuka
  if (isOpening) {
    setTimeout(function() { initTimePickers(el); }, 50);
  }
}

function toggleCollapse(contentId, triggerEl) {
  const content = document.getElementById(contentId);
  if (!content) return;
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    triggerEl.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    triggerEl.classList.add('collapsed');
  }
}

// ══════════════════════════════════════════════════════════
//  FILE VIEWER INLINE (PDF / DOCX / IMAGE)
// ══════════════════════════════════════════════════════════
function openFileViewer(url, title) {
  if (!url || url === '-' || url === '') { showToast('File tidak tersedia.', 'error'); return; }
  const modal = document.getElementById('file-viewer-modal');
  const bodyEl = document.getElementById('fv-body');
  const titleEl = document.getElementById('fv-title');
  const iconEl = document.getElementById('fv-icon');
  const dlEl = document.getElementById('fv-download');
  if (!modal) { window.open(url, '_blank'); return; }

  titleEl.textContent = title || 'File';
  dlEl.href = url;
  // Tentukan tipe file dari URL / nama
  const urlLower = (url + (title || '')).toLowerCase();
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(urlLower) || /image/i.test(urlLower);
  const isPdf = /\.pdf(\?|$)/i.test(urlLower) || /pdf/i.test(urlLower);
  const isDocx = /\.docx?(\?|$)/i.test(urlLower);

  if (isImage) {
    iconEl.className = 'bi bi-image';
    // Konversi URL Drive ke direct view
    let imgUrl = url;
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) imgUrl = 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200';
    bodyEl.innerHTML = '<img src="' + imgUrl + '" style="max-width:100%;max-height:80vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.4)" onerror="this.src=\'' + url + '\'" />';
  } else if (isPdf) {
    iconEl.className = 'bi bi-file-earmark-pdf-fill';
    // Gunakan Google Drive viewer untuk PDF
    let viewUrl = url;
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m2) viewUrl = 'https://drive.google.com/file/d/' + m2[1] + '/preview';
    bodyEl.innerHTML = '<iframe src="' + viewUrl + '" style="width:min(800px,90vw);height:80vh;border:none;border-radius:8px;background:#fff"></iframe>';
  } else if (isDocx) {
    iconEl.className = 'bi bi-file-earmark-word-fill';
    // Gunakan Google Docs viewer
    let viewUrl = 'https://docs.google.com/viewer?embedded=true&url=' + encodeURIComponent(url);
    const m3 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m3) viewUrl = 'https://drive.google.com/file/d/' + m3[1] + '/preview';
    bodyEl.innerHTML = '<iframe src="' + viewUrl + '" style="width:min(800px,90vw);height:80vh;border:none;border-radius:8px;background:#fff"></iframe>';
  } else {
    // Fallback: coba Google Drive preview
    iconEl.className = 'bi bi-file-earmark';
    const m4 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m4) {
      bodyEl.innerHTML = '<iframe src="https://drive.google.com/file/d/' + m4[1] + '/preview" style="width:min(800px,90vw);height:80vh;border:none;border-radius:8px;background:#fff"></iframe>';
    } else {
      bodyEl.innerHTML = '<div style="color:#fff;text-align:center;padding:40px"><i class="bi bi-file-earmark" style="font-size:3rem;display:block;margin-bottom:16px"></i><p>Preview tidak tersedia untuk tipe file ini.</p><a href="' + url + '" target="_blank" style="color:#60a5fa">Buka di tab baru</a></div>';
    }
  }

  modal.style.display = 'flex';
}

function closeFileViewer() {
  const modal = document.getElementById('file-viewer-modal');
  if (modal) {
    modal.style.display = 'none';
    const bodyEl = document.getElementById('fv-body');
    if (bodyEl) bodyEl.innerHTML = ''; // Hentikan iframe/video
  }
}

// ══════════════════════════════════════════════════════════
//  PREVIEW MODAL (IFRAME) — legacy, tetap dipertahankan
// ══════════════════════════════════════════════════════════
function openPreview(url) {
  const overlay = document.getElementById('preview-overlay');
  const frame = document.getElementById('preview-frame');
  let previewUrl = url;
  if (url.includes('/view')) {
    previewUrl = url.replace(/\/view.*$/, '/preview');
  } else if (!url.includes('/preview')) {
    previewUrl = url + '/preview';
  }
  frame.src = previewUrl;
  overlay.classList.add('active');
}

function closePreview() {
  document.getElementById('preview-overlay').classList.remove('active');
  document.getElementById('preview-frame').src = '';
}

function filterTable(tableId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#' + tableId + ' tbody tr:not(.no-data)').forEach(function (row) {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ══════════════════════════════════════════════════════════
//  DATA FORMATTERS
// ══════════════════════════════════════════════════════════
function esc(str) {
  if (!str) return '-';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(val) {
  if (!val || val === '-') return '-';
  try {
    // Handle dd/MM/yyyy HH:mm format (format baru dari sheet)
    const ddmmMatch = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (ddmmMatch) {
      const d = new Date(ddmmMatch[3], ddmmMatch[2] - 1, ddmmMatch[1], ddmmMatch[4] || 0, ddmmMatch[5] || 0);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return String(val); }
}

function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/**
 * Parse berbagai format tanggal ke format yyyy-MM-dd untuk input[type=date]
 * Mendukung: yyyy-MM-dd, dd/MM/yyyy HH:mm, dd/MM/yyyy, ISO string
 */
function _parseToDateInput(val) {
  if (!val || val === '-') return '';
  const s = String(val).trim();
  // Format dd/MM/yyyy (baru dari sheet)
  const ddmm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmm) return ddmm[3] + '-' + ddmm[2] + '-' + ddmm[1];
  // Format yyyy-MM-dd atau ISO
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return '';
}

function resetFields(ids) {
  ids.forEach(function (id) { const el = document.getElementById(id); if (el) el.value = ''; });
}
