// ══════════════════════════════════════════════════════════
//  MODUL: TEMPLATE SURAT (DOCXTEMPLATER)
// ══════════════════════════════════════════════════════════
const TEMPLATE_STATE = {
  allTemplates: [],           // Cache daftar template
  selected: null,             // Template yang dipilih saat generate
  detectedVars: [],           // Variabel terdeteksi dari file .docx
  currentFileB64: null,       // Base64 file mentah
  bufferCache: {}             // Cache ArrayBuffer untuk mempercepat preview
};

/**
 * Ekstrak variabel {{...}} dari teks — mendukung semua karakter valid docxtemplater
 */
function extractVariables(text) {
  // Hapus XML tags dulu, lalu cari pola {{...}}
  const clean = text.replace(/<[^>]+>/g, ' ');
  // Gabungkan teks yang mungkin terpecah oleh XML tags
  const merged = clean.replace(/\}\s*\{/g, '}{');
  const regex = /\{\{([^{}#/^@>!][^{}]*?)\}\}/g;
  const vars = [];
  let match;
  while ((match = regex.exec(merged)) !== null) {
    const name = match[1].trim();
    // Abaikan loop/condition tags docxtemplater
    if (name && !name.startsWith('#') && !name.startsWith('/') && !name.startsWith('^') && !vars.includes(name)) {
      vars.push(name);
    }
  }
  return vars;
}

/**
 * Rekonstruksi teks dari XML docx yang mungkin terpecah antar run tags.
 * Ini penting agar variabel seperti {{nama}} yang terpecah jadi
 * <w:t>{{</w:t><w:t>nama</w:t><w:t>}}</w:t> tetap terdeteksi.
 */
function reconstructDocxText(xml) {
  // Gabungkan semua <w:t> dalam satu <w:r> (run)
  let result = xml;
  // Hapus semua tag kecuali w:t, lalu ambil isinya
  result = result.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1');
  result = result.replace(/<[^>]+>/g, ' ');
  return result;
}

/**
 * Parse docx sebagai ZIP untuk mendapatkan daftar variabel di dalamnya.
 * Membaca SEMUA bagian dokumen: body, header, footer, footnotes, endnotes, dll.
 * Mendukung variabel yang terpecah antar XML run tags.
 */
function parseDocxVariables(base64Content) {
  try {
    const binary = atob(base64Content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const zip = new PizZip(bytes.buffer);

    // Daftar semua file XML yang mungkin mengandung variabel
    const xmlParts = [
      'word/document.xml',
      'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
      'word/footnotes.xml', 'word/endnotes.xml',
      'word/comments.xml'
    ];

    let combinedText = '';
    xmlParts.forEach(function (f) {
      try {
        const fileObj = zip.file(f);
        if (fileObj) {
          const raw = fileObj.asText();
          combinedText += ' ' + reconstructDocxText(raw);
        }
      } catch (e) { /* file tidak ada, skip */ }
    });

    // Juga coba baca semua file word/*.xml yang ada
    const allFiles = Object.keys(zip.files);
    allFiles.forEach(function (fname) {
      if (fname.startsWith('word/') && fname.endsWith('.xml') && !xmlParts.includes(fname)) {
        try {
          const raw = zip.file(fname).asText();
          combinedText += ' ' + reconstructDocxText(raw);
        } catch (e) { /* skip */ }
      }
    });

    // Juga coba rekonstruksi dari XML mentah untuk menangkap variabel yang terpecah
    xmlParts.forEach(function (f) {
      try {
        const fileObj = zip.file(f);
        if (fileObj) {
          const raw = fileObj.asText();
          // Coba gabungkan semua w:t dalam satu w:p (paragraph)
          const paragraphs = raw.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
          paragraphs.forEach(function (para) {
            const texts = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            const joined = texts.map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('');
            combinedText += ' ' + joined;
          });
        }
      } catch (e) { /* skip */ }
    });

    return extractVariables(combinedText);
  } catch (e) {
    console.warn('parseDocxVariables error:', e);
    return [];
  }
}

/**
 * Handle form pemilihan file .docx
 */
async function handleTemplateFileSelect() {
  const fileEl = document.getElementById('tpl-file');
  const file = fileEl.files[0];
  if (!file) return;
  
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
    showToast('Hanya file .docx yang didukung untuk template!', 'error');
    fileEl.value = '';
    return;
  }
  if (!fileName.endsWith('.docx')) {
    showToast('File .doc terdeteksi. Disarankan menggunakan format .docx untuk hasil terbaik.', 'info');
  }
  
  document.getElementById('tpl-file-info').textContent = '📎 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';

  const nameEl = document.getElementById('tpl-nama');
  if (nameEl && !nameEl.value) {
    nameEl.value = file.name.replace(/\.(docx?|DOC[X]?)$/i, '').replace(/_/g, ' ');
  }

  showSpinner('Membaca dan menganalisis template...');
  try {
    const reader = new FileReader();
    reader.onload = function (e) {
      hideSpinner();
      const b64 = e.target.result.split(',')[1];
      TEMPLATE_STATE.currentFileB64 = b64;
      const vars = parseDocxVariables(b64);
      TEMPLATE_STATE.detectedVars = vars;

      const previewEl = document.getElementById('tpl-vars-preview');
      const listEl = document.getElementById('tpl-vars-list');
      if (vars.length > 0) {
        listEl.innerHTML = vars.map(function (vn) {
          return '<span class="var-badge"><i class="bi bi-braces"></i>' + esc(vn) + '</span>';
        }).join('');
        previewEl.style.display = 'block';
        showToast(vars.length + ' variabel terdeteksi!', 'success');
      } else {
        listEl.innerHTML = '<span style="color:var(--text-muted);font-size:.82rem"><i class="bi bi-info-circle"></i> Tidak ada variabel {{...}} ditemukan. Template tetap bisa disimpan dan digunakan tanpa pengisian variabel.</span>';
        previewEl.style.display = 'block';
        showToast('Tidak ada variabel terdeteksi. Template tetap bisa disimpan.', 'info');
      }
    };
    reader.onerror = function () { hideSpinner(); showToast('Gagal membaca file.', 'error'); };
    reader.readAsDataURL(file);
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

async function submitTemplate() {
  const namaTemplate = v('tpl-nama');
  const deskripsi = v('tpl-deskripsi');
  const fileEl = document.getElementById('tpl-file');

  if (!namaTemplate) { showToast('Nama template wajib diisi.', 'error'); return; }
  if (!fileEl.files[0]) { showToast('File .docx wajib diunggah.', 'error'); return; }
  if (!TEMPLATE_STATE.currentFileB64) { showToast('Pilih file terlebih dahulu.', 'error'); return; }

  showSpinner('Mengunggah template...', ['Menyiapkan file', 'Mengunggah ke Google Drive', 'Menyimpan metadata']);
  try {
    setSpinnerStep(0, 3);
    const file = fileEl.files[0];
    const fileData = {
      content: TEMPLATE_STATE.currentFileB64,
      name: file.name,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: (file.size / 1024).toFixed(1) + ' KB'
    };
    setSpinnerStep(1, 3);
    setSpinnerLabel('Mengunggah ke Google Drive...', 'Proses ini mungkin memakan waktu beberapa saat');
    const res = await callAPI('saveTemplate', {
      data: { namaTemplate: namaTemplate, deskripsi: deskripsi, variables: TEMPLATE_STATE.detectedVars },
      fileData: fileData
    });
    finishSpinner(3);
    await new Promise(function (r) { setTimeout(r, 200); });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      if (res.fileId && res.fileId !== '-') {
        window.open('https://docs.google.com/document/d/' + res.fileId + '/edit', '_blank');
      }
      resetFields(['tpl-nama', 'tpl-deskripsi']);
      fileEl.value = '';
      document.getElementById('tpl-file-info').textContent = '';
      document.getElementById('tpl-vars-preview').style.display = 'none';
      document.getElementById('tpl-vars-list').innerHTML = '';
      TEMPLATE_STATE.currentFileB64 = null;
      TEMPLATE_STATE.detectedVars = [];
      togglePanel('form-template');
      loadTemplates();
    } else {
      showToast(res.message || 'Gagal menyimpan template.', 'error');
    }
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

async function loadTemplates() {
  try {
    const res = await callAPI('getTemplates', {});
    const grid = document.getElementById('template-grid');
    if (!grid) return;
    if (!res.success || !res.data.length) {
      TEMPLATE_STATE.allTemplates = [];
      grid.innerHTML = '<div class="tpl-empty-state"><i class="bi bi-file-earmark-word"></i><p>Belum ada template. Klik "Upload Template Baru" untuk menambahkan.</p></div>';
      return;
    }
    TEMPLATE_STATE.allTemplates = res.data;
    renderTemplateGrid(grid, res.data, false);
  } catch (e) { showToast('Gagal memuat template: ' + e.message, 'error'); }
}

function renderTemplateGrid(gridEl, data, selectable) {
  if (!data || !data.length) {
    gridEl.innerHTML = '<div class="tpl-empty-state"><i class="bi bi-file-earmark-word"></i><p>Belum ada template tersedia.</p></div>';
    return;
  }
  gridEl.innerHTML = data.map(function (d) {
    let vars = [];
    try { vars = JSON.parse(d['Variables'] || '[]'); } catch (e) { vars = []; }
    const tglDibuat = d['Dibuat Pada'] ? fmtDate(d['Dibuat Pada']) : (d['DibuatPada'] ? fmtDate(d['DibuatPada']) : '-');
    const safeId = esc(d['ID']);
    const safeName = esc(d['Nama Template']);
    const varCount = vars.length;

    if (selectable) {
      return '<div class="tpl-card selectable" data-id="' + safeId + '" onclick="selectTemplateForGenerator(\'' + safeId + '\')">' +
        '<div class="tpl-card-header">' +
        '<div class="tpl-card-icon"><i class="bi bi-file-earmark-word-fill"></i></div>' +
        '<div class="tpl-card-title"><h4>' + safeName + '</h4>' +
        '<div class="tpl-card-date" style="margin-top:4px"><i class="bi bi-calendar3"></i> ' + tglDibuat + ' &bull; <i class="bi bi-braces"></i> ' + varCount + ' variabel</div>' +
        '</div>' +
        '<i class="bi bi-chevron-right" style="color:var(--text-muted);flex-shrink:0"></i>' +
        '</div>' +
        '</div>';
    } else {
      return '<div class="tpl-card" data-id="' + safeId + '">' +
        '<div class="tpl-card-header">' +
        '<div class="tpl-card-icon"><i class="bi bi-file-earmark-word-fill"></i></div>' +
        '<div class="tpl-card-title">' +
        '<h4>' + safeName + '</h4>' +
        '<div class="tpl-card-date" style="margin-top:4px"><i class="bi bi-calendar3"></i> ' + tglDibuat + ' &bull; <i class="bi bi-braces"></i> ' + varCount + ' variabel' +
        (d['URL'] ? ' &bull; <a href="' + esc(d['URL']) + '" target="_blank" style="color:var(--primary)"><i class="bi bi-download"></i> Unduh asli</a>' : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="tpl-card-actions">' +
        '<button class="btn-use" onclick="setGenTab(\'gen-buat\');setTimeout(function(){selectTemplateForGenerator(\'' + safeId + '\')},150)"><i class="bi bi-pencil-square"></i> Buat Surat</button>' +
        (d['File ID'] && d['File ID'] !== '-'
          ? '<button class="btn-secondary" onclick="openDocsEditor(\'' + esc(d['File ID']) + '\',\'' + safeId + '\')" style="background:var(--surface);border:1px solid var(--border);color:var(--text-main);padding:8px 12px;border-radius:8px;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="bi bi-google"></i> Edit di Docs</button>'
          : '') +
        '<button class="btn-del" onclick="deleteTemplateById(\'' + safeId + '\')"><i class="bi bi-trash"></i> Hapus</button>' +
        '</div>' +
        '</div>';
    }
  }).join('');
}


function openDocsEditor(fileId, templateId) {
  // URL Google Docs editor penuh — tanpa ?rm=minimal agar semua fitur tersedia
  const editUrl = 'https://docs.google.com/document/d/' + fileId + '/edit';
  const isDark = document.body.classList.contains('dark-mode');

  // Hapus modal lama
  const oldModal = document.getElementById('de-modal');
  if (oldModal) oldModal.remove();

  // Inject style sekali
  if (!document.getElementById('de-modal-style')) {
    const s = document.createElement('style');
    s.id = 'de-modal-style';
    s.textContent = `
      #de-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.0);display:flex;flex-direction:column;animation:deFadeIn .18s ease}
      @keyframes deFadeIn{from{opacity:0}to{opacity:1}}
      #de-modal .de-box{display:flex;flex-direction:column;width:100%;height:100vh;height:100dvh;background:#fff}
      #de-modal .de-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:linear-gradient(135deg,#1a73e8,#0f4c81);color:#fff;gap:10px;flex-shrink:0;min-height:52px}
      #de-modal .de-ttl{display:flex;align-items:center;gap:9px;font-size:.92rem;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #de-modal .de-ttl i{font-size:1.1rem;flex-shrink:0}
      #de-modal .de-acts{display:flex;align-items:center;gap:6px;flex-shrink:0}
      #de-modal .de-btn{border:none;color:#fff;font-size:.8rem;display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;background:rgba(255,255,255,.18);cursor:pointer;transition:.18s;text-decoration:none;white-space:nowrap;font-family:inherit;font-weight:600}
      #de-modal .de-btn:hover{background:rgba(255,255,255,.32);transform:translateY(-1px)}
      #de-modal .de-btn:active{transform:translateY(0);opacity:.8}
      #de-modal .de-btn.green{background:rgba(22,163,74,.85)}
      #de-modal .de-btn.green:hover{background:#16a34a}
      #de-modal .de-btn.close{background:rgba(220,38,38,.7)}
      #de-modal .de-btn.close:hover{background:rgba(220,38,38,1)}
      #de-modal .de-info{font-size:.7rem;color:rgba(255,255,255,.7);padding:0 16px 6px;background:linear-gradient(135deg,#1a73e8,#0f4c81);flex-shrink:0;display:flex;align-items:center;gap:6px}
      #de-modal .de-iframe-wrap{flex:1;position:relative;overflow:hidden;min-height:0}
      #de-modal iframe{position:absolute;inset:0;width:100%;height:100%;border:none;display:block}
      #de-modal .de-loader{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${isDark ? '#1e2433' : '#f8fafc'};z-index:2;gap:12px}
      #de-modal .de-loader span{font-size:.82rem;color:${isDark ? '#94a3b8' : '#64748b'};font-weight:600}
      @media(max-width:640px){
        #de-modal .de-btn span{display:none}
        #de-modal .de-hdr{padding:8px 12px}
      }
    `;
    document.head.appendChild(s);
  }

  const modal = document.createElement('div');
  modal.id = 'de-modal';
  modal.innerHTML =
    '<div class="de-box">' +
    '<div class="de-hdr">' +
    '<div class="de-ttl">' +
    '<i class="bi bi-file-earmark-word-fill" style="color:#4fc3f7"></i>' +
    '<span>Edit Template — Google Docs</span>' +
    '</div>' +
    '<div class="de-acts">' +
    (templateId
      ? '<button class="de-btn green" onclick="syncTemplateFromDrive(\'' + esc(templateId) + '\',\'' + esc(fileId) + '\')" title="Sinkronkan variabel dari file terbaru"><i class="bi bi-arrow-repeat"></i><span> Sinkronkan</span></button>'
      : '') +
    '<a href="' + editUrl + '" target="_blank" class="de-btn" title="Buka di tab baru"><i class="bi bi-box-arrow-up-right"></i><span> Tab Baru</span></a>' +
    '<button class="de-btn close" onclick="document.getElementById(\'de-modal\').remove()" title="Tutup"><i class="bi bi-x-lg"></i><span> Tutup</span></button>' +
    '</div>' +
    '</div>' +
    '<div class="de-info"><i class="bi bi-info-circle-fill"></i> Setelah selesai mengedit, klik <strong style="color:#fff">Sinkronkan</strong> untuk memperbarui variabel template.</div>' +
    '<div class="de-iframe-wrap">' +
    '<div class="de-loader" id="de-loader">' +
    '<div class="spin" style="width:36px;height:36px;border:3px solid rgba(26,115,232,.2);border-top-color:#1a73e8;border-radius:50%;animation:spin .8s linear infinite"></div>' +
    '<span>Membuka Google Docs...</span>' +
    '</div>' +
    '<iframe src="' + editUrl + '" allowfullscreen allow="clipboard-read; clipboard-write" onload="var l=document.getElementById(\'de-loader\');if(l)l.style.display=\'none\'"></iframe>' +
    '</div>' +
    '</div>';

  // ESC untuk tutup
  const escHandler = function(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(modal);
}

/**
 * Sinkronkan variabel template dari file Drive setelah diedit di Google Docs.
 * Mengunduh file .docx terbaru via proxy, parse ulang variabel, update di sheet.
 */
async function syncTemplateFromDrive(templateId, fileId) {
  showToast('Mengunduh file terbaru dari Drive...', 'info');
  try {
    // Unduh file terbaru via proxy
    const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
    const resp = await fetch(BASE_URL + '/api/downloadDriveProxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'downloadDriveProxy', payload: { url: downloadUrl } })
    });
    if (!resp.ok) throw new Error('Gagal mengunduh file (HTTP ' + resp.status + ')');

    const buf = await resp.arrayBuffer();
    const header = new Uint8Array(buf.slice(0, 4));
    if (header[0] !== 0x50 || header[1] !== 0x4B) throw new Error('File bukan format .docx yang valid.');

    // Parse variabel dari file terbaru
    const binary = String.fromCharCode.apply(null, new Uint8Array(buf));
    const b64 = btoa(binary);
    const vars = parseDocxVariables(b64);

    // Update cache buffer
    TEMPLATE_STATE.bufferCache[templateId] = buf;

    // Update variabel di sheet via API
    showSpinner('Menyimpan variabel yang diperbarui...');
    const res = await callAPI('updateTemplateVars', { id: templateId, variables: vars });
    hideSpinner();

    if (res.success) {
      // Update cache lokal
      const tpl = TEMPLATE_STATE.allTemplates.find(function (t) { return String(t['ID']) === String(templateId); });
      if (tpl) tpl['Variables'] = JSON.stringify(vars);

      showToast(vars.length + ' variabel berhasil disinkronkan dari file terbaru!', 'success');
      // Tutup modal dan reload
      const deModal = document.getElementById('de-modal');
      if (deModal) deModal.remove();
      loadTemplates();
    } else {
      showToast(res.message || 'Gagal menyimpan variabel.', 'error');
    }
  } catch (e) {
    hideSpinner();
    showToast('Sinkronisasi gagal: ' + e.message, 'error');
  }
}

function filterTemplateCards(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.tpl-card').forEach(function (card) {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? '' : 'none';
  });
}

async function deleteTemplateById(id) {
  if (!confirm('Yakin ingin menghapus template ini? File di Google Drive juga akan dihapus.')) return;
  showSpinner('Menghapus template...');
  try {
    const res = await callAPI('deleteTemplate', { id: id });
    hideSpinner();
    if (res.success) { showToast(res.message, 'success'); loadTemplates(); }
    else showToast(res.message, 'error');
  } catch (e) { hideSpinner(); showToast('Error: ' + e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════
//  MODUL: BUAT SURAT (GENERATOR WIZARD)
// ══════════════════════════════════════════════════════════
async function loadTemplatesForGenerator() {
  try {
    const res = await callAPI('getTemplates', {});
    const grid = document.getElementById('generator-template-grid');
    if (!grid) return;
    if (!res.success || !res.data.length) {
      TEMPLATE_STATE.allTemplates = [];
      grid.innerHTML = '<div class="tpl-empty-state"><i class="bi bi-file-earmark-word"></i><p>Belum ada template tersedia. <a onclick="setGenTab(\'gen-template\')" style="color:var(--primary);cursor:pointer">Upload template terlebih dahulu.</a></p></div>';
      return;
    }
    TEMPLATE_STATE.allTemplates = res.data;
    renderTemplateGrid(grid, res.data, true);
  } catch (e) { console.warn('Load templates wizard error', e); }
}

async function selectTemplateForGenerator(templateId) {
  const tpl = TEMPLATE_STATE.allTemplates.find(function (t) { return String(t['ID']) === String(templateId); });
  if (!tpl) { showToast('Template tidak ditemukan.', 'error'); return; }

  document.querySelectorAll('#generator-template-grid .tpl-card').forEach(function (c) { c.classList.remove('selected'); });
  const card = document.querySelector('#generator-template-grid [data-id="' + templateId + '"]');
  if (card) card.classList.add('selected');

  TEMPLATE_STATE.selected = tpl;

  let vars = [];
  try { vars = JSON.parse(tpl['Variables'] || '[]'); } catch (e) { vars = []; }

  // Jika variabel belum tersimpan di sheet, coba ambil dari file docx langsung
  if (!vars.length && (tpl['URL'] || tpl['File URL'])) {
    showSpinner('Menganalisis variabel template...');
    try {
      let url = tpl['URL'] || tpl['File URL'] || '';
      if (url.includes('drive.google.com')) {
        const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m) url = 'https://drive.google.com/uc?export=download&id=' + m[1];
      }
      const resp = await fetch(BASE_URL + '/api/downloadDriveProxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'downloadDriveProxy', payload: { url: url } })
      });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const header = new Uint8Array(buf.slice(0, 4));
        if (header[0] === 0x50 && header[1] === 0x4B) {
          // Valid ZIP/DOCX
          const binary = String.fromCharCode.apply(null, new Uint8Array(buf));
          const b64 = btoa(binary);
          vars = parseDocxVariables(b64);
          // Simpan ke cache buffer juga
          TEMPLATE_STATE.bufferCache[templateId] = buf;
        }
      }
    } catch (e) { console.warn('Re-scan vars error:', e); }
    hideSpinner();
  }

  const nameEl = document.getElementById('gen-template-name');
  if (nameEl) nameEl.textContent = '📄 ' + tpl['Nama Template'];

  const formArea = document.getElementById('dynamic-form-area');
  if (!formArea) return;

  if (!vars.length) {
    formArea.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-muted)">' +
      '<i class="bi bi-info-circle" style="font-size:2rem;display:block;margin-bottom:10px"></i>' +
      '<p>Template ini tidak memiliki variabel <code>{{...}}</code>. Langsung klik <strong>Preview</strong> atau <strong>Unduh .docx</strong>.</p></div>';
  } else {
    formArea.innerHTML = vars.map(function (varName) {
      const safeId = 'gen-var-' + varName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      let label = '';
      let inputHtml = '';
      let isWide = false; // apakah field ini perlu lebar penuh

      if (varName.startsWith('select_')) {
        const parts = varName.split('_');
        label = parts[1] ? parts[1].replace(/_/g, ' ').replace(/\b\w/g, function(c){return c.toUpperCase();}) : 'Pilihan';
        const options = parts.slice(2);
        inputHtml = '<select class="form-control-custom" id="' + safeId + '">' +
          '<option value="">— Pilih ' + esc(label) + ' —</option>' +
          options.map(function (opt) { return '<option value="' + esc(opt) + '">' + esc(opt) + '</option>'; }).join('') +
          '</select>';
      } else if (varName.startsWith('date_') || /^tanggal|^tgl|^date/i.test(varName)) {
        // Strip only the type prefix (date_), keep the rest as the label
        var rawLabel = varName.replace(/^date_/i, '').replace(/^tgl_/i, '');
        label = rawLabel.replace(/_/g, ' ').replace(/\b\w/g, function(c){return c.toUpperCase();}) || 'Tanggal';
        inputHtml = '<input type="date" class="form-control-custom" id="' + safeId + '" />';
      } else if (varName.startsWith('datetime_') || /^waktu_|^jam_/i.test(varName)) {
        // Strip only the type prefix (datetime_), keep the rest as the label
        var rawLabelDt = varName.replace(/^datetime_/i, '').replace(/^waktu_/i, '').replace(/^jam_/i, '');
        label = rawLabelDt.replace(/_/g, ' ').replace(/\b\w/g, function(c){return c.toUpperCase();}) || 'Waktu';
        // Gunakan time picker analog (jam, bukan kalender)
        inputHtml = '<input type="text" class="form-control-custom time-input" id="' + safeId + '" placeholder="--:--" readonly data-timepicker />';
      } else if (/textarea|isi_|konten|keterangan|uraian|deskripsi|perihal|catatan/i.test(varName)) {
        label = varName.replace(/_/g, ' ').replace(/\b\w/g, function(c){return c.toUpperCase();});
        inputHtml = '<textarea class="form-control-custom" id="' + safeId + '" rows="3" placeholder="Isi ' + esc(label) + '..." style="resize:vertical"></textarea>';
        isWide = true;
      } else {
        label = varName.replace(/_/g, ' ').replace(/\b\w/g, function(c){return c.toUpperCase();});
        inputHtml = '<input type="text" class="form-control-custom" id="' + safeId + '" placeholder="Isi ' + esc(label) + '..." autocomplete="off" />';
      }

      return '<div class="form-group' + (isWide ? ' gen-var-wide' : '') + '"><label>' + esc(label) + '</label>' + inputHtml + '</div>';
    }).join('');

    // Init time picker untuk field datetime — dua kali untuk memastikan
    setTimeout(function() {
      var formEl = document.getElementById('dynamic-form-area');
      if (formEl && typeof initTimePickers === 'function') initTimePickers(formEl);
    }, 80);
    setTimeout(function() {
      var formEl = document.getElementById('dynamic-form-area');
      if (formEl && typeof initTimePickers === 'function') initTimePickers(formEl);
    }, 300);
  }

  wizardGoTo(2);
}

function wizardGoTo(step) {
  // Sembunyikan semua step
  [1, 2, 3].forEach(function (n) {
    const el = document.getElementById('buat-step' + n);
    if (el) el.style.display = 'none';
    // Update step bar
    const wsItem = document.getElementById('ws-item-' + n);
    if (wsItem) {
      wsItem.classList.remove('active', 'done');
      if (n < step) wsItem.classList.add('done');
      else if (n === step) wsItem.classList.add('active');
    }
  });

  // Tampilkan step yang dituju
  const target = document.getElementById('buat-step' + step);
  if (target) target.style.display = 'block';

  // Scroll ke atas panel
  const genContent = document.getElementById('content-gen-buat');
  if (genContent) {
    setTimeout(function() {
      genContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  if (step === 3) {
    renderGenerateSummary();
  }
}

function renderGenerateSummary() {
  const summaryEl = document.getElementById('gen-data-summary');
  if (!summaryEl || !TEMPLATE_STATE.selected) return;
  const tpl = TEMPLATE_STATE.selected;
  const formData = collectFormData();

  const items = [
    { key: 'template', val: tpl['Nama Template'] }
  ];

  Object.keys(formData).forEach(function (key) {
    items.push({ key: key, val: formData[key] || '(kosong)' });
  });

  summaryEl.innerHTML = items.map(function (item) {
    return '<div class="gen-summary-item">' +
      '<div class="gen-summary-key">{{' + item.key + '}}</div>' +
      '<div class="gen-summary-val">' + esc(item.val) + '</div>' +
      '</div>';
  }).join('');
}

function collectFormData() {
  const tpl = TEMPLATE_STATE.selected;
  if (!tpl) return {};
  let vars = [];
  try { vars = JSON.parse(tpl['Variables'] || '[]'); } catch (e) { vars = []; }
  const data = {};

  vars.forEach(function (varName) {
    const safeId = 'gen-var-' + varName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const el = document.getElementById(safeId);
    let val = el ? el.value : '';

    // Format tanggal ke bahasa Indonesia
    const isDate = varName.startsWith('date_') || /^tanggal_|^tgl_/i.test(varName);
    const isDateTime = varName.startsWith('datetime_') || /^waktu_|^jam_/i.test(varName);

    if (val && isDateTime) {
      // val adalah HH:mm dari time picker
      if (/^\d{2}:\d{2}$/.test(val)) {
        val = 'Pukul ' + val + ' WIB';
      } else {
        // fallback: coba parse datetime-local
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          val = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
            ' Pukul ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        }
      }
    } else if (val && isDate && el && el.type === 'date') {
      const d = new Date(val + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        val = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    }

    data[varName] = val;
  });
  return data;
}

async function buildDocxBlob(tpl, data) {
  const templateId = tpl['ID'];
  let arrayBuffer;

  // Gunakan cache jika ada
  if (TEMPLATE_STATE.bufferCache[templateId]) {
    arrayBuffer = TEMPLATE_STATE.bufferCache[templateId].slice(0);
  } else {
    let url = tpl['URL'] || tpl['File URL'] || '';
    // Normalisasi URL Google Drive ke format download langsung
    if (url.includes('drive.google.com')) {
      const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m) url = 'https://drive.google.com/uc?export=download&id=' + m[1];
    }
    const response = await fetch(BASE_URL + '/api/downloadDriveProxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'downloadDriveProxy', payload: { url: url } })
    });
    if (!response.ok) throw new Error('Gagal mengambil template dari server (HTTP ' + response.status + ')');

    const rawBuffer = await response.arrayBuffer();
    if (rawBuffer.byteLength < 100) throw new Error('File template kosong atau tidak valid.');
    TEMPLATE_STATE.bufferCache[templateId] = rawBuffer;
    arrayBuffer = rawBuffer.slice(0);
  }

  // Validasi magic bytes DOCX (PK zip header)
  const header = new Uint8Array(arrayBuffer.slice(0, 4));
  if (header[0] !== 0x50 || header[1] !== 0x4B) {
    // Bukan ZIP/DOCX — mungkin HTML error page dari Drive
    delete TEMPLATE_STATE.bufferCache[templateId];
    throw new Error('File yang diunduh bukan format .docx yang valid. Pastikan file di Google Drive dapat diakses.');
  }

  let zip;
  try {
    zip = new PizZip(arrayBuffer);
  } catch (zipErr) {
    delete TEMPLATE_STATE.bufferCache[templateId];
    throw new Error('Gagal membuka file .docx: ' + zipErr.message);
  }

  // Cari class Docxtemplater dari berbagai kemungkinan nama global
  const DocxClass = (typeof docxtemplater !== 'undefined' && docxtemplater) ||
    (typeof Docxtemplater !== 'undefined' && Docxtemplater) ||
    (window.docxtemplater) || (window.Docxtemplater);
  if (!DocxClass) throw new Error('Library Docxtemplater belum termuat. Coba refresh halaman.');

  let doc;
  try {
    doc = new DocxClass(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      // nullGetter: kembalikan string kosong untuk variabel yang tidak diisi
      nullGetter: function (part) {
        if (!part.module) return '';
        return '';
      },
      // errorLogging: false agar tidak spam console
      errorLogging: false
    });
  } catch (initErr) {
    throw new Error('Gagal inisialisasi template: ' + initErr.message);
  }

  // Helper: generate blob dari doc instance
  const _genBlob = function(docInstance) {
    return docInstance.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE'
    });
  };

  // Helper: buat doc baru dengan opsi toleran
  const _makeDoc = function(buf) {
    const z = new PizZip(buf);
    return new DocxClass(z, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: function () { return ''; },
      errorLogging: false
    });
  };

  try {
    doc.render(data);
    return _genBlob(doc);
  } catch (renderErr) {
    // Tangani error render dengan pesan yang informatif
    let msg = renderErr.message || 'Unknown render error';
    if (renderErr.properties) {
      const props = renderErr.properties;
      if (props.errors && props.errors.length) {
        msg = props.errors.map(function (e) {
          return (e.properties && e.properties.explanation) ? e.properties.explanation : (e.message || '');
        }).filter(Boolean).join('; ');
      } else if (props.explanation) {
        msg = props.explanation;
      }
    }

    // Jika error karena variabel tidak dikenal / sintaks — coba render ulang lebih toleran
    const isNonFatal = msg.includes('scopeParser') || msg.includes('tag') ||
                       msg.includes('delimiter') || msg.includes('Unclosed') ||
                       msg.includes('unopened') || msg.includes('rawXml');
    if (isNonFatal) {
      console.warn('Template render warning (non-fatal), retrying:', msg);
      try {
        const doc2 = _makeDoc(arrayBuffer);
        doc2.render(data);
        return _genBlob(doc2);
      } catch (e2) {
        // Coba render dengan data kosong sebagai last resort
        try {
          const doc3 = _makeDoc(arrayBuffer);
          doc3.render({});
          console.warn('Rendered with empty data as fallback');
          return _genBlob(doc3);
        } catch (e3) {
          throw new Error('Render template gagal: ' + msg + '. Periksa sintaks variabel {{...}} di file .docx Anda.');
        }
      }
    }
    throw new Error('Render template gagal: ' + msg + '. Periksa sintaks variabel {{...}} di file .docx Anda.');
  }
}

// Helper: setelah docx-preview render, hitung ulang margin-bottom tiap halaman
// agar saat di-scale (transform) halaman tidak overlap satu sama lain
function _fixDocxPageMargins(container) {
  if (!container) return;
  var vw = window.innerWidth;
  var paperW = 794; // A4 @ 96dpi
  var padding = vw >= 860 ? 32 : (vw >= 480 ? 32 : 16);
  var scale = vw >= 860 ? 1 : Math.min(1, (vw - padding) / paperW);
  if (scale >= 1) return; // tidak perlu koreksi

  container.querySelectorAll('.docx-wrapper > section.docx').forEach(function(page) {
    // Ukur tinggi asli halaman (sebelum scale)
    var h = page.scrollHeight || page.offsetHeight || 1123; // A4 height fallback ~1123px
    // Setelah scale, tinggi visual = h * scale
    // Tapi elemen masih mengambil ruang h (karena transform tidak mengubah layout flow)
    // Jadi kita perlu margin-bottom negatif untuk "menarik" halaman berikutnya ke atas
    // margin-bottom = -(h - h*scale) + gap = h*(scale-1) + gap
    var gap = 20; // gap antar halaman
    var mb = Math.round(h * (scale - 1) + gap);
    page.style.marginBottom = mb + 'px';
  });
}

// ── Helper: unduh preview sebagai PDF via print dialog ──
// Membuat iframe tersembunyi dengan konten preview, lalu trigger print.
// Browser modern (Chrome/Edge/Safari) mendukung "Save as PDF" dari dialog print.
function _downloadPreviewAsPdf(fileName) {
  const bodyEl = document.getElementById('dp-body');
  if (!bodyEl) { window.print(); return; }

  // Ambil HTML konten preview yang sudah dirender
  const previewHtml = bodyEl.innerHTML;
  if (!previewHtml || previewHtml.includes('dp-loading') || previewHtml.includes('dp-error')) {
    showToast('Preview belum siap. Tunggu hingga dokumen selesai dirender.', 'error');
    return;
  }

  // Buat iframe tersembunyi dengan konten preview + CSS print
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:none;visibility:hidden';
  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument || iframe.contentWindow.document;
  iDoc.open();
  iDoc.write(`<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>${fileName || 'Dokumen'}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  /* Sembunyikan semua kecuali konten dokumen */
  body > *:not(.docx-wrapper) { display: none !important; }
  .docx-wrapper { display: block !important; background: transparent !important; padding: 0 !important; }
  .docx-wrapper > section.docx {
    transform: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always;
    width: 794px !important;
  }
  @media print {
    html, body { background: #fff; }
    .docx-wrapper > section.docx { page-break-after: always; }
  }
</style>
</head><body>${previewHtml}</body></html>`);
  iDoc.close();

  // Tunggu konten termuat lalu print
  iframe.onload = function() {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch(e) {
      // Fallback: print halaman utama
      window.print();
    }
    // Hapus iframe setelah print dialog ditutup
    setTimeout(function() {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 3000);
  };

  showToast('Dialog cetak/simpan PDF akan terbuka. Pilih "Save as PDF" sebagai printer.', 'info');
}

async function previewDocument() {
  const tpl = TEMPLATE_STATE.selected;
  if (!tpl) { showToast('Pilih template terlebih dahulu.', 'error'); return; }

  const statusEl = document.getElementById('gen-status');
  const statusText = document.getElementById('gen-status-text');
  if (statusEl) statusEl.style.display = 'block';
  if (statusText) statusText.textContent = 'Mengunduh & merender dokumen...';

  let blob;
  try {
    blob = await buildDocxBlob(tpl, collectFormData());
  } catch (e) {
    if (statusEl) statusEl.style.display = 'none';
    showToast('Gagal membuat dokumen: ' + e.message, 'error');
    return;
  }
  if (statusEl) statusEl.style.display = 'none';

  const isDark = document.body.classList.contains('dark-mode');
  const pageBg = isDark ? '#1a2035' : '#d1d5db';
  const fileName = (tpl['Nama Template'] || 'surat').replace(/[^a-zA-Z0-9_\-]/g, '_');

  // Hapus modal lama jika ada
  const oldModal = document.getElementById('docx-preview-modal');
  if (oldModal) oldModal.remove();

  // Inject style sekali saja — hapus dulu jika sudah ada agar selalu fresh
  const oldStyle = document.getElementById('docx-preview-style');
  if (oldStyle) oldStyle.remove();

  const st = document.createElement('style');
  st.id = 'docx-preview-style';
  st.textContent = `
    /* Modal backdrop */
    #docx-preview-modal{position:fixed;inset:0;z-index:9999;background:rgba(10,16,30,.88);display:flex;flex-direction:column;align-items:stretch;animation:dpFadeIn .2s ease}
    @keyframes dpFadeIn{from{opacity:0}to{opacity:1}}
    #docx-preview-modal .dp-box{display:flex;flex-direction:column;width:100%;height:100vh;height:100dvh}
    #docx-preview-modal .dp-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#0f172a;color:#f1f5f9;gap:8px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.08)}
    #docx-preview-modal .dp-title{display:flex;align-items:center;gap:8px;font-size:.9rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
    #docx-preview-modal .dp-actions{display:flex;gap:6px;flex-shrink:0}
    #docx-preview-modal .dp-btn{border:none;color:#fff;font-size:.8rem;display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:6px;background:rgba(255,255,255,.12);cursor:pointer;transition:.15s;text-decoration:none;white-space:nowrap}
    #docx-preview-modal .dp-btn:hover{background:rgba(255,255,255,.22)}
    #docx-preview-modal .dp-btn.primary{background:#2563eb}
    #docx-preview-modal .dp-btn.primary:hover{background:#1d4ed8}
    #docx-preview-modal .dp-btn.danger{background:rgba(220,38,38,.7)}
    #docx-preview-modal .dp-btn.danger:hover{background:rgba(220,38,38,.9)}

    /* Scrollable body */
    #docx-preview-modal .dp-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:24px 16px;background:${pageBg};display:flex;flex-direction:column;align-items:center}
    #docx-preview-modal .dp-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:14px;color:#94a3b8}
    #docx-preview-modal .dp-error{padding:32px;text-align:center;color:#f87171;max-width:500px}

    /* docx-preview wrapper — kertas A4 tetap proporsional */
    #docx-preview-modal .docx-wrapper{background:transparent!important;padding:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;width:100%!important}

    /* Setiap halaman kertas: lebar A4 = 794px @ 96dpi, tidak stretch ke layar */
    #docx-preview-modal .docx-wrapper>section.docx{
      margin:0 auto 20px!important;
      box-shadow:0 4px 28px rgba(0,0,0,.45)!important;
      border-radius:2px!important;
      transform-origin:top center!important;
      flex-shrink:0!important;
    }

    /* Layar < 860px: scale kertas proporsional agar muat tanpa mengubah layout */
    @media(max-width:860px){
      #docx-preview-modal .dp-body{padding:16px 8px;overflow-x:hidden}
      #docx-preview-modal .docx-wrapper>section.docx{
        transform:scale(calc((100vw - 32px) / 794))!important;
        transform-origin:top center!important;
      }
    }
    @media(max-width:480px){
      #docx-preview-modal .dp-body{padding:12px 4px}
      #docx-preview-modal .docx-wrapper>section.docx{
        transform:scale(calc((100vw - 16px) / 794))!important;
        transform-origin:top center!important;
      }
      #docx-preview-modal .dp-btn span{display:none}
    }

    /* Print: kertas asli tanpa scale */
    @media print{
      body>*:not(#docx-preview-modal){display:none!important}
      #docx-preview-modal{position:static!important;background:none!important;display:block!important}
      #docx-preview-modal .dp-hdr{display:none!important}
      #docx-preview-modal .dp-box{height:auto!important}
      #docx-preview-modal .dp-body{overflow:visible!important;padding:0!important;background:transparent!important;display:block!important}
      #docx-preview-modal .docx-wrapper{display:block!important}
      #docx-preview-modal .docx-wrapper>section.docx{transform:none!important;margin:0!important;box-shadow:none!important;page-break-after:always;width:794px!important}
    }
  `;
  document.head.appendChild(st);

  const modal = document.createElement('div');
  modal.id = 'docx-preview-modal';
  modal.innerHTML =
    '<div class="dp-box">' +
    '<div class="dp-hdr">' +
    '<div class="dp-title"><i class="bi bi-file-earmark-text-fill" style="color:#60a5fa;flex-shrink:0"></i><span>' + esc(tpl['Nama Template']) + '</span></div>' +
    '<div class="dp-actions">' +
    '<button class="dp-btn primary" id="dp-btn-pdf"><i class="bi bi-file-earmark-pdf-fill"></i><span> Unduh PDF</span></button>' +
    '<button class="dp-btn" id="dp-btn-dl"><i class="bi bi-file-earmark-word-fill"></i><span> Unduh .docx</span></button>' +
    '<button class="dp-btn danger" onclick="document.getElementById(\'docx-preview-modal\').remove()"><i class="bi bi-x-lg"></i></button>' +
    '</div>' +
    '</div>' +
    '<div class="dp-body" id="dp-body">' +
    '<div class="dp-loading"><div class="spin" style="width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite"></div><span>Merender dokumen...</span></div>' +
    '</div>' +
    '</div>';

  document.body.appendChild(modal);

  // Tutup saat klik backdrop
  modal.addEventListener('click', function (ev) {
    if (ev.target === modal) modal.remove();
  });

  // Tombol aksi
  document.getElementById('dp-btn-dl').addEventListener('click', function () {
    saveAs(blob, fileName + '_generated.docx');
    showToast('File .docx berhasil diunduh!', 'success');
  });

  // Tombol Unduh PDF — gunakan print dialog browser yang diarahkan ke PDF
  document.getElementById('dp-btn-pdf').addEventListener('click', function () {
    _downloadPreviewAsPdf(fileName);
  });

  // Render docx ke HTML
  const bodyEl = document.getElementById('dp-body');
  try {
    // Cari fungsi renderAsync dari library docx-preview
    // Library bisa ter-expose sebagai window.docx atau window.docxPreview
    const renderFn = (window.docx && window.docx.renderAsync) ||
      (window.docxPreview && window.docxPreview.renderAsync) ||
      (typeof renderAsync !== 'undefined' && renderAsync);

    if (!renderFn) {
      throw new Error('Library docx-preview tidak tersedia. Pastikan script sudah dimuat.');
    }

    bodyEl.innerHTML = '';
    await renderFn(blob, bodyEl, null, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true
    });

    // Setelah render: pastikan wrapper transparan, kertas tetap ukuran aslinya
    const wrapper = bodyEl.querySelector('.docx-wrapper');
    if (wrapper) {
      wrapper.style.background = 'transparent';
      wrapper.style.padding = '0';
      wrapper.style.width = '100%';
    }
    // Hitung ulang margin-bottom tiap halaman agar tidak overlap saat di-scale
    // Tunggu browser selesai layout sebelum mengukur offsetHeight
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        _fixDocxPageMargins(bodyEl);
      });
    });
    showToast('Preview dokumen siap!', 'success');
  } catch (renderErr) {
    console.error('docx-preview render error:', renderErr);
    // Fallback: tampilkan pesan error + tombol unduh tetap berfungsi
    bodyEl.innerHTML =
      '<div class="dp-error">' +
      '<i class="bi bi-exclamation-triangle-fill" style="font-size:2.5rem;display:block;margin-bottom:12px;color:#fbbf24"></i>' +
      '<p style="font-size:.95rem;font-weight:600;margin-bottom:8px">Preview visual tidak tersedia</p>' +
      '<p style="font-size:.82rem;color:#94a3b8;margin-bottom:20px">' + esc(renderErr.message) + '</p>' +
      '<p style="font-size:.82rem;color:#94a3b8">File .docx sudah berhasil dibuat dan dapat diunduh menggunakan tombol <strong>Unduh .docx</strong> di atas.</p>' +
      '</div>';
  }
}

async function generateAndDownload(format) {
  const tpl = TEMPLATE_STATE.selected;
  if (!tpl) { showToast('Pilih template terlebih dahulu.', 'error'); return; }
  if (format === 'preview') { previewDocument(); return; }

  const statusEl = document.getElementById('gen-status');
  const statusText = document.getElementById('gen-status-text');
  if (statusEl) statusEl.style.display = 'block';
  if (statusText) statusText.textContent = 'Mengunduh template dari server...';

  try {
    const blob = await buildDocxBlob(tpl, collectFormData());
    if (statusEl) statusEl.style.display = 'none';
    const fileName = (tpl['Nama Template'] || 'surat').replace(/[^a-zA-Z0-9_\-]/g, '_');

    if (format === 'docx') {
      saveAs(blob, fileName + '_generated.docx');
      showToast('File .docx berhasil diunduh!', 'success');
    } else if (format === 'pdf') {
      // Untuk PDF: buka preview lalu user bisa print ke PDF
      previewDocument();
    }
  } catch (e) {
    if (statusEl) statusEl.style.display = 'none';
    console.error('generateAndDownload error:', e);
    showToast('Gagal generate dokumen: ' + e.message, 'error');
  }
}

function resetGenerator() {
  TEMPLATE_STATE.selected = null;
  const formArea = document.getElementById('dynamic-form-area');
  if (formArea) formArea.innerHTML = '';
  const summary = document.getElementById('gen-data-summary');
  if (summary) summary.innerHTML = '';
  const statusEl = document.getElementById('gen-status');
  if (statusEl) statusEl.style.display = 'none';
  const nameEl = document.getElementById('gen-template-name');
  if (nameEl) nameEl.textContent = '';
  document.querySelectorAll('#generator-template-grid .tpl-card').forEach(function (c) { c.classList.remove('selected'); });
  wizardGoTo(1);
}

