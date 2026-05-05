// ══════════════════════════════════════════════════════════
//  UNIVERSAL EDIT SYSTEM (ALL MODULES)
// ══════════════════════════════════════════════════════════
function closeEditModal() {  document.getElementById('edit-modal').style.display = 'none';
  currentEditData = null;
  document.getElementById('edit-file').value = '';
  document.getElementById('edit-file-info').textContent = '';
  _deleteFileFlag = false;
  _deleteAgendaSambutanFlag = false;
  _deleteAgendaSapaanFlag = false;
  // Reset file section highlight
  const sec = document.getElementById('edit-file-section');
  if (sec) { sec.style.borderColor = ''; sec.style.background = ''; }
  const lbl = document.getElementById('edit-file-label');
  if (lbl) { lbl.innerHTML = 'Ganti Lampiran File? (Opsional)'; }
}

/**
 * Fetch nama "Kepada" dari sheet Disposisi berdasarkan Referensi Agenda ID,
 * lalu isi field ed-ag-disposisikepada di form edit.
 */
async function _fetchDisposisiKepada(agendaId) {
  try {
    const res = await callAPI('getDisposisi', {});
    if (!res.success || !res.data) return;
    const disp = res.data.find(function(d) {
      return String(d['Referensi Agenda ID']) === String(agendaId);
    });
    if (!disp) return;
    const kepada = disp['Kepada'] || '';
    if (!kepada) return;
    const el = document.getElementById('ed-ag-disposisikepada');
    if (el && !el.value) el.value = kepada;
    else if (el) el.value = kepada; // selalu pakai data dari sheet disposisi
  } catch (e) { /* silent fail */ }
}

function openEditModal(sheetType, dataEnc) {
  const d = JSON.parse(decodeURIComponent(dataEnc));
  currentEditData = { sheet: sheetType, id: d['ID'], oriData: d };
  document.getElementById('edit-modal-title').textContent = 'Edit Data ' + sheetType;

  const c = document.getElementById('edit-form-container');
  let html = '';

  // Builder form dinamis berdasarkan tipe sheet
  if (sheetType === 'Arsip') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nama File</label><input type="text" id="ed-arsip-nama" class="form-control-custom" value="${esc(d['Nama File'])}"></div>
        <div class="form-group"><label>Kategori</label>
          <select id="ed-arsip-kat" class="form-control-custom">
            <optgroup label="Produk Hukum Bupati">
              <option value="Keputusan Bupati" ${d['Kategori']==='Keputusan Bupati'?'selected':''}>Keputusan Bupati</option>
              <option value="Instruksi Bupati" ${d['Kategori']==='Instruksi Bupati'?'selected':''}>Instruksi Bupati</option>
              <option value="Peraturan Bupati" ${d['Kategori']==='Peraturan Bupati'?'selected':''}>Peraturan Bupati</option>
            </optgroup>
            <optgroup label="Administrasi Surat">
              <option value="Surat Edaran Bupati" ${d['Kategori']==='Surat Edaran Bupati'?'selected':''}>Surat Edaran Bupati</option>
              <option value="Nota Dinas" ${d['Kategori']==='Nota Dinas'?'selected':''}>Nota Dinas</option>
              <option value="Surat Tugas" ${d['Kategori']==='Surat Tugas'?'selected':''}>Surat Tugas</option>
              <option value="Surat Perintah" ${d['Kategori']==='Surat Perintah'?'selected':''}>Surat Perintah</option>
              <option value="Disposisi / Memo" ${d['Kategori']==='Disposisi / Memo'?'selected':''}>Disposisi / Memo</option>
            </optgroup>
            <optgroup label="Lainnya">
              <option value="Lainnya" ${(d['Kategori']==='Lainnya'||!d['Kategori'])?'selected':''}>Lainnya</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Deskripsi</label><input type="text" id="ed-arsip-desk" class="form-control-custom" value="${esc(d['Deskripsi'])}"></div>
      <div class="form-group"><label>Tanggal Arsip Asli</label><input type="date" id="ed-arsip-tgl" class="form-control-custom" value="${d['Tanggal Arsip'] ? d['Tanggal Arsip'].substring(0, 10) : ''}"></div>`;
  } else if (sheetType === 'Surat Masuk') {
    html = `<div class="grid-2">
        <div class="form-group"><label>Nomor Surat</label><input type="text" id="ed-sm-nomor" class="form-control-custom" value="${esc(d['Nomor Surat'])}"></div>
        <div class="form-group"><label>Tanggal</label><input type="date" id="ed-sm-tgl" class="form-control-custom" value="${d['Tanggal']}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Pengirim</label><input type="text" id="ed-sm-pengirim" class="form-control-custom" value="${esc(d['Pengirim'])}"></div>
        <div class="form-group"><label>Kategori</label>
          <select id="ed-sm-kat" class="form-control-custom">
            <option value="Umum" ${d['Kategori']==='Umum'?'selected':''}>Umum</option>
            <option value="Penting" ${d['Kategori']==='Penting'?'selected':''}>Penting</option>
            <option value="Rahasia" ${d['Kategori']==='Rahasia'?'selected':''}>Rahasia</option>
            <option value="Undangan" ${d['Kategori']==='Undangan'?'selected':''}>Undangan</option>
            <option value="Lainnya" ${(d['Kategori']==='Lainnya'||!d['Kategori'])?'selected':''}>Lainnya</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Perihal</label><input type="text" id="ed-sm-perihal" class="form-control-custom" value="${esc(d['Perihal'])}"></div>
      <div class="form-group"><label>Catatan</label><input type="text" id="ed-sm-catatan" class="form-control-custom" value="${esc(d['Catatan'])}"></div>`;
  } else if (sheetType === 'Agenda') {
    const waktuStr = esc(d['Waktu'] || '');
    let jamM = '', jamS = '';
    if (waktuStr) {
      if (waktuStr.includes('-')) {
        const parts = waktuStr.split('-');
        jamM = parts[0].trim();
        jamS = parts[1].trim();
        // Keep 'Selesai' as-is so the button renders correctly
      } else {
        jamM = waktuStr.trim();
      }
    }

    html = `<div class="form-group"><label>Nama Kegiatan</label><input type="text" id="ed-ag-nama" class="form-control-custom" value="${esc(d['Nama Kegiatan'])}"></div>
      <div class="form-group"><label>Tanggal</label><input type="date" id="ed-ag-tanggal" class="form-control-custom" value="${_parseToDateInput(d['Tanggal'] || '')}"></div>
      <div class="grid-2">
        <div class="form-group"><label>Jam Mulai</label><input type="text" data-timepicker id="ed-ag-jam-mulai" class="form-control-custom time-input" value="${jamM}" placeholder="--:--" readonly></div>
        <div class="form-group"><label>Jam Selesai</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="ed-ag-jam-selesai" class="form-control-custom time-input" value="${jamS}" style="flex:1" placeholder="--:--" ${jamS === 'Selesai' ? '' : 'data-timepicker readonly'}>
            <button type="button" class="btn-secondary-custom" onclick="toggleJamSelesai('ed-ag-jam-selesai', this)" style="padding:0 12px;font-size:0.75rem;white-space:nowrap">${jamS === 'Selesai' ? 'Pilih Jam' : 'Teks Selesai'}</button>
          </div>
        </div>
      </div>
      <div class="form-group"><label>Lokasi</label><input type="text" id="ed-ag-lokasi" class="form-control-custom" value="${esc(d['Lokasi'])}"></div>
      <div class="grid-2">
        <div class="form-group"><label>Pakaian</label><input type="text" id="ed-ag-pakaian" class="form-control-custom" value="${esc(d['Pakaian'])}"></div>
        <div class="form-group"><label>Transit</label><input type="text" id="ed-ag-transit" class="form-control-custom" value="${esc(d['Transit'])}"></div>
      </div>
      <div class="form-group"><label>Keterangan</label><textarea id="ed-ag-ket" class="form-control-custom" rows="2">${esc(d['Keterangan'])}</textarea></div>
      <div class="grid-2">
        <div class="form-group"><label>CP Nama</label><input type="text" id="ed-ag-cp-nama" class="form-control-custom" value="${esc(d['CP Nama'] || '')}"></div>
        <div class="form-group"><label>CP No WA</label><input type="text" id="ed-ag-cp-wa" class="form-control-custom" value="${esc(String(d['CP No WA'] || '').replace(/^'/, ''))}"></div>
      </div>
      <div class="form-group"><label>Status Kehadiran</label>
        <select id="ed-ag-status" class="form-control-custom" onchange="const c = document.getElementById('ed-ag-disp-card'); if(this.value==='Disposisi') c.style.display='block'; else c.style.display='none';">
          <option value="Hadir" ${d['Status Kehadiran'] === 'Hadir' ? 'selected' : ''}>Hadir</option>
          <option value="Tidak Hadir" ${d['Status Kehadiran'] === 'Tidak Hadir' ? 'selected' : ''}>Tidak Hadir</option>
          <option value="Disposisi" ${d['Status Kehadiran'] === 'Disposisi' ? 'selected' : ''}>Disposisi</option>
        </select>
      </div>
      <div class="form-group" id="ed-ag-disp-card" style="display:${d['Status Kehadiran'] === 'Disposisi' ? 'block' : 'none'};background:rgba(217,119,6,0.1);padding:15px;border-radius:8px;border:1px solid rgba(217,119,6,0.3)">
        <label style="color:#b45309"><strong>Didisposisikan Kepada</strong></label>
        <input type="text" id="ed-ag-disposisikepada" class="form-control-custom" list="list-pejabat-dynamic" value="${esc(d['Kepada Disposisi'] || d['Disposisi Kepada'] || '')}">
      </div>
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--body-bg);margin-top:4px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:.82rem;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:7px">
            <i class="bi bi-geo-alt-fill" style="color:#1e6fd9"></i> Koordinat Lokasi <span style="font-size:.72rem;font-weight:400;color:var(--text-muted)">(opsional)</span>
          </div>
          <button type="button" onclick="openPickMapModal('edit')" style="display:flex;align-items:center;gap:6px;background:#1e6fd9;color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:.75rem;font-weight:700;cursor:pointer">
            <i class="bi bi-map"></i> Pilih di Peta
          </button>
        </div>
        <div class="grid-2" style="margin-bottom:0">
          <div class="form-group" style="margin-bottom:0"><label style="font-size:.75rem">Latitude</label><input type="number" step="any" id="ed-ag-lat" class="form-control-custom" value="${d['Latitude'] || ''}" placeholder="-7.8648" oninput="syncPickMapPreview('edit')"></div>
          <div class="form-group" style="margin-bottom:0"><label style="font-size:.75rem">Longitude</label><input type="number" step="any" id="ed-ag-lng" class="form-control-custom" value="${d['Longitude'] || ''}" placeholder="111.4637" oninput="syncPickMapPreview('edit')"></div>
        </div>
        <div id="ed-ag-coord-preview" style="margin-top:8px;font-size:.72rem;color:#16a34a;font-weight:600;display:${(d['Latitude'] && d['Longitude']) ? 'flex' : 'none'};align-items:center;gap:5px">
          <i class="bi bi-check-circle-fill"></i> <span id="ed-ag-coord-preview-txt">${d['Latitude'] && d['Longitude'] ? d['Latitude'] + ', ' + d['Longitude'] : ''}</span>
        </div>
      </div>
      ${/* File Sambutan */ ''}
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--body-bg);margin-top:8px">
        <div style="font-size:.82rem;font-weight:700;color:#3b82f6;margin-bottom:8px"><i class="bi bi-file-text"></i> File Sambutan</div>
        ${d['URL Sambutan'] && d['URL Sambutan'] !== '' ? `<div id="ed-ag-sambutan-file-current" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;padding:6px 10px;background:rgba(59,130,246,.08);border-radius:6px;border:1px solid rgba(59,130,246,.2)">
          <span style="font-size:.78rem;color:#3b82f6"><i class="bi bi-paperclip"></i> File sambutan tersimpan</span>
          <div style="display:flex;gap:4px">
            <button onclick="openFileViewer('${esc(d['URL Sambutan'])}','Sambutan')" style="padding:3px 8px;font-size:.7rem;background:#3b82f611;color:#3b82f6;border:1px solid #3b82f633;border-radius:5px;cursor:pointer"><i class="bi bi-eye"></i> Lihat</button>
            <button onclick="markAgendaFileForDeletion('sambutan')" style="padding:3px 8px;font-size:.7rem;background:rgba(225,29,72,.1);color:#e11d48;border:1px solid rgba(225,29,72,.2);border-radius:5px;cursor:pointer"><i class="bi bi-trash"></i></button>
          </div>
        </div>` : ''}
        <div class="form-group" style="margin-bottom:4px"><label style="font-size:.75rem">Teks Sambutan</label><textarea id="ed-ag-sambutan" class="form-control-custom" rows="2" placeholder="Teks sambutan...">${esc(d['Sambutan'] || '')}</textarea></div>
        <div class="file-drop" style="margin-top:6px">
          <input type="file" id="ed-ag-sambutan-file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onchange="handleFileSelect('ed-ag-sambutan-file','ed-ag-sambutan-file-info')" />
          <div class="drop-icon" style="font-size:1.2rem"><i class="bi bi-file-earmark-arrow-up"></i></div>
          <div class="drop-text" style="font-size:.75rem">Ganti file sambutan (PDF/DOCX/Gambar)</div>
          <div class="drop-name" id="ed-ag-sambutan-file-info"></div>
        </div>
      </div>
      ${/* File Sapaan */ ''}
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--body-bg);margin-top:8px">
        <div style="font-size:.82rem;font-weight:700;color:#8b5cf6;margin-bottom:8px"><i class="bi bi-people"></i> File Sapaan</div>
        ${d['URL Sapaan'] && d['URL Sapaan'] !== '' ? `<div id="ed-ag-sapaan-file-current" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;padding:6px 10px;background:rgba(139,92,246,.08);border-radius:6px;border:1px solid rgba(139,92,246,.2)">
          <span style="font-size:.78rem;color:#8b5cf6"><i class="bi bi-paperclip"></i> File sapaan tersimpan</span>
          <div style="display:flex;gap:4px">
            <button onclick="openFileViewer('${esc(d['URL Sapaan'])}','Sapaan')" style="padding:3px 8px;font-size:.7rem;background:#8b5cf611;color:#8b5cf6;border:1px solid #8b5cf633;border-radius:5px;cursor:pointer"><i class="bi bi-eye"></i> Lihat</button>
            <button onclick="markAgendaFileForDeletion('sapaan')" style="padding:3px 8px;font-size:.7rem;background:rgba(225,29,72,.1);color:#e11d48;border:1px solid rgba(225,29,72,.2);border-radius:5px;cursor:pointer"><i class="bi bi-trash"></i></button>
          </div>
        </div>` : ''}
        <div class="form-group" style="margin-bottom:4px"><label style="font-size:.75rem">Teks Sapaan</label><textarea id="ed-ag-sapaan" class="form-control-custom" rows="2" placeholder="Teks sapaan...">${esc(d['Sapaan'] || '')}</textarea></div>
        <div class="file-drop" style="margin-top:6px">
          <input type="file" id="ed-ag-sapaan-file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onchange="handleFileSelect('ed-ag-sapaan-file','ed-ag-sapaan-file-info')" />
          <div class="drop-icon" style="font-size:1.2rem"><i class="bi bi-file-earmark-arrow-up"></i></div>
          <div class="drop-text" style="font-size:.75rem">Ganti file sapaan (PDF/DOCX/Gambar)</div>
          <div class="drop-name" id="ed-ag-sapaan-file-info"></div>
        </div>
      </div>`;
  } else if (sheetType === 'Disposisi') {
    const dispWaktu = esc(d['Waktu'] || '');
    let dispJamM = '', dispJamS = '';
    if (dispWaktu && dispWaktu.includes('-')) {
      const dp = dispWaktu.split('-');
      dispJamM = dp[0].trim();
      dispJamS = dp[1].trim();
    } else if (dispWaktu) {
      dispJamM = dispWaktu.trim();
    }

    html = `<div class="form-group"><label>Referensi Agenda ID</label><input type="text" id="ed-disp-ref" class="form-control-custom" value="${esc(d['Referensi Agenda ID'])}" readonly style="opacity:.7;background:var(--body-bg)"></div>
      <div class="grid-2">
        <div class="form-group"><label>Dari</label><input type="text" id="ed-disp-dari" class="form-control-custom" value="${esc(d['Dari'])}"></div>
        <div class="form-group"><label>Kepada <span class="req">*</span></label><input type="text" id="ed-disp-kepada" class="form-control-custom" list="list-pejabat-dynamic" value="${esc(d['Kepada'])}"></div>
      </div>
      <div class="form-group"><label>Nama Kegiatan</label><input type="text" id="ed-disp-nama-kegiatan" class="form-control-custom" value="${esc(d['Nama Kegiatan'] || '')}"></div>
      <div class="grid-2">
        <div class="form-group"><label>Tanggal</label><input type="date" id="ed-disp-tanggal" class="form-control-custom" value="${_parseToDateInput(d['Tanggal'] || '')}"></div>
        <div class="form-group"><label>Status</label>
          <select id="ed-disp-status" class="form-control-custom">
            <option value="Diproses" ${(d['Status'] === 'Diproses' || d['Status'] === 'Proses' || d['Status'] === 'Menunggu' || !d['Status']) ? 'selected' : ''}>Diproses</option>
            <option value="Selesai" ${d['Status'] === 'Selesai' ? 'selected' : ''}>Selesai</option>
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label>Jam Mulai</label><input type="text" data-timepicker id="ed-disp-jam-mulai" class="form-control-custom time-input" value="${dispJamM}" placeholder="--:--" readonly></div>
        <div class="form-group"><label>Jam Selesai</label>
          <div style="display:flex;gap:6px">
            <input type="text" id="ed-disp-jam-selesai" class="form-control-custom time-input" value="${dispJamS}" style="flex:1" placeholder="--:--" ${dispJamS === 'Selesai' ? '' : 'data-timepicker readonly'}>
            <button type="button" class="btn-secondary-custom" onclick="toggleJamSelesai('ed-disp-jam-selesai', this)" style="padding:0 10px;font-size:0.72rem;white-space:nowrap">${dispJamS === 'Selesai' ? 'Pilih Jam' : 'Teks Selesai'}</button>
          </div>
        </div>
        <div class="form-group"><label>Lokasi</label><input type="text" id="ed-disp-lokasi" class="form-control-custom" value="${esc(d['Lokasi'] || '')}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label>Pakaian</label><input type="text" id="ed-disp-pakaian" class="form-control-custom" value="${esc(d['Pakaian'] || '')}"></div>
        <div class="form-group"><label>CP Nama</label><input type="text" id="ed-disp-cp-nama" class="form-control-custom" value="${esc(d['CP Nama'] || '')}"></div>
      </div>
      <div class="form-group">
        <label>CP No WA</label>
        <input type="text" id="ed-disp-cp-wa" class="form-control-custom" placeholder="08xxxxxxxxxx" value="${esc(String(d['CP No WA'] || '').replace(/^'+/, ''))}">
      </div>`;
  }

  // Render lampiran utama jika ada
  const currentUrl = d['URL'] || d['File URL'];
  if (currentUrl && currentUrl !== '-' && currentUrl !== '') {
    const fileLabel = sheetType === 'Agenda' ? 'Surat/Undangan' : (d['Nama File'] || 'Lampiran');
    const fileHtml = `<div id="edit-current-file" style="margin-top:12px;padding:10px;background:var(--body-bg);border-radius:8px;border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
          <i class="bi bi-file-earmark-text" style="color:var(--primary)"></i>
          <span style="font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(fileLabel)}</span>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn-link-custom" style="padding:4px 8px;font-size:.7rem" onclick="openFileViewer('${currentUrl}','${esc(fileLabel)}')"><i class="bi bi-eye"></i> Lihat</button>
          <button class="btn-danger-custom" style="padding:4px 8px;font-size:.7rem;background:rgba(225,29,72,0.1);color:#e11d48;border:1px solid rgba(225,29,72,0.2)" onclick="markFileForDeletion()"><i class="bi bi-trash"></i> Hapus</button>
        </div>
      </div>`;
    html += fileHtml;
  }

  c.innerHTML = html;
  // Re-init time picker untuk input yang baru diinjeksikan secara dinamis
  setTimeout(function() { initTimePickers(c); }, 80);

  // Sesuaikan label dan visibilitas section file utama
  const fileSection = document.getElementById('edit-file-section');
  const fileLabel = document.getElementById('edit-file-label');
  const editFileInput = document.getElementById('edit-file');
  const editFileInfo = document.getElementById('edit-file-info');

  // Reset file input
  if (editFileInput) editFileInput.value = '';
  if (editFileInfo) editFileInfo.textContent = '';

  if (sheetType === 'Agenda') {
    if (fileLabel) fileLabel.textContent = 'Ganti Surat / Undangan Asli? (Opsional)';
    if (fileSection) fileSection.style.display = 'block';
    if (editFileInput) editFileInput.setAttribute('accept', '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif');
  } else if (sheetType === 'Disposisi') {
    // Disposisi tidak punya lampiran file
    if (fileSection) fileSection.style.display = 'none';
  } else {
    // Arsip, Surat Masuk
    if (fileLabel) fileLabel.textContent = 'Ganti File Lampiran? (Opsional)';
    if (fileSection) fileSection.style.display = 'block';
    if (editFileInput) editFileInput.setAttribute('accept', '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.ppt,.pptx');
  }

  document.getElementById('edit-modal').style.display = 'flex';

  // Jika Agenda dengan status Disposisi, fetch nama "Kepada" dari sheet Disposisi
  if (sheetType === 'Agenda' && d['Status Kehadiran'] === 'Disposisi') {
    _fetchDisposisiKepada(d['ID']);
  }
}

let _deleteFileFlag = false;
let _deleteAgendaSambutanFlag = false;
let _deleteAgendaSapaanFlag = false;

function markFileForDeletion() {
  if (!confirm('Yakin ingin menghapus lampiran ini? File akan dihapus saat data disimpan.')) return;
  _deleteFileFlag = true;
  const el = document.getElementById('edit-current-file');
  if (el) el.style.display = 'none';
  // Highlight upload section agar user tahu bisa upload pengganti
  const sec = document.getElementById('edit-file-section');
  if (sec) {
    sec.style.borderColor = '#f59e0b';
    sec.style.background = 'rgba(245,158,11,.06)';
    const lbl = document.getElementById('edit-file-label');
    if (lbl) lbl.innerHTML = '<i class="bi bi-exclamation-triangle-fill" style="color:#f59e0b"></i> File dihapus — upload pengganti di bawah (opsional)';
  }
  showToast('Lampiran akan dihapus saat data disimpan.', 'info');
}

function markAgendaFileForDeletion(type) {
  if (!confirm('Yakin ingin menghapus file ' + type + ' ini?')) return;
  if (type === 'sambutan') {
    _deleteAgendaSambutanFlag = true;
    const el = document.getElementById('ed-ag-sambutan-file-current');
    if (el) el.style.display = 'none';
  } else if (type === 'sapaan') {
    _deleteAgendaSapaanFlag = true;
    const el = document.getElementById('ed-ag-sapaan-file-current');
    if (el) el.style.display = 'none';
  }
  showToast('File ' + type + ' akan dihapus saat data disimpan.', 'info');
}

async function submitEditData() {
  if (!currentEditData) return;
  const t = currentEditData.sheet;

  // Baca flag sebelum direset
  const doDeleteFile = _deleteFileFlag;
  const doDeleteSambutan = _deleteAgendaSambutanFlag;
  const doDeleteSapaan = _deleteAgendaSapaanFlag;

  // Reset flag
  _deleteFileFlag = false;
  _deleteAgendaSambutanFlag = false;
  _deleteAgendaSapaanFlag = false;

  const payload = { id: currentEditData.id, sheetName: t, data: { deleteFile: doDeleteFile } };

  if (t === 'Arsip') {
    Object.assign(payload.data, { namaFile: v('ed-arsip-nama'), kategori: v('ed-arsip-kat'), deskripsi: v('ed-arsip-desk'), tglArsip: v('ed-arsip-tgl') });
  } else if (t === 'Surat Masuk') {
    Object.assign(payload.data, { nomorSurat: v('ed-sm-nomor'), tanggal: v('ed-sm-tgl'), pengirim: v('ed-sm-pengirim'), perihal: v('ed-sm-perihal'), catatan: v('ed-sm-catatan'), kategori: v('ed-sm-kat') });
  } else if (t === 'Agenda') {
    const jamM = v('ed-ag-jam-mulai');
    const jamS = v('ed-ag-jam-selesai');
    let waktuStr = '';
    if (jamM) { waktuStr = jamM + (jamS ? ' - ' + jamS : ' - Selesai'); }
    else if (jamS) { waktuStr = '- ' + jamS; }

    Object.assign(payload.data, {
      namaKegiatan: v('ed-ag-nama'), tanggal: v('ed-ag-tanggal'),
      lokasi: v('ed-ag-lokasi'), waktu: waktuStr, pakaian: v('ed-ag-pakaian'),
      transit: v('ed-ag-transit'), keterangan: v('ed-ag-ket'),
      sambutan: v('ed-ag-sambutan'), sapaan: v('ed-ag-sapaan'),
      cpNama: v('ed-ag-cp-nama'), cpNoWa: v('ed-ag-cp-wa'),
      statusKehadiran: v('ed-ag-status'), disposisiKepada: v('ed-ag-disposisikepada'),
      latitude: v('ed-ag-lat') || '', longitude: v('ed-ag-lng') || '',
      deleteSambutan: doDeleteSambutan,
      deleteSapaan: doDeleteSapaan
    });
  } else if (t === 'Disposisi') {
    const dispJamM2 = v('ed-disp-jam-mulai');
    const dispJamS2 = v('ed-disp-jam-selesai');
    let dispWaktuStr = '';
    if (dispJamM2) { dispWaktuStr = dispJamM2 + (dispJamS2 ? ' - ' + dispJamS2 : ' - Selesai'); }
    else if (dispJamS2) { dispWaktuStr = '- ' + dispJamS2; }
    Object.assign(payload.data, {
      agendaId: v('ed-disp-ref'),
      dari: v('ed-disp-dari'),
      kepada: v('ed-disp-kepada'),
      status: v('ed-disp-status'),
      namaKegiatan: v('ed-disp-nama-kegiatan'),
      tanggal: v('ed-disp-tanggal'),
      waktu: dispWaktuStr,
      lokasi: v('ed-disp-lokasi'),
      pakaian: v('ed-disp-pakaian'),
      cpNama: v('ed-disp-cp-nama'),
      cpNoWa: v('ed-disp-cp-wa')
    });
  }
  // Deteksi file yang akan diproses
  const fileEl = document.getElementById('edit-file');
  const hasMainFile = fileEl && fileEl.files[0];
  const fSambutanEl = t === 'Agenda' ? document.getElementById('ed-ag-sambutan-file') : null;
  const fSapaanEl = t === 'Agenda' ? document.getElementById('ed-ag-sapaan-file') : null;
  const hasSambutanFile = fSambutanEl && fSambutanEl.files[0];
  const hasSapaanFile = fSapaanEl && fSapaanEl.files[0];

  // Buat langkah-langkah progress
  const steps = ['Menyiapkan data'];
  if (hasMainFile) steps.push('Membaca file lampiran');
  if (hasSambutanFile) steps.push('Membaca file sambutan');
  if (hasSapaanFile) steps.push('Membaca file sapaan');
  if (hasMainFile || hasSambutanFile || hasSapaanFile) steps.push('Mengunggah file ke Drive');
  steps.push('Menyimpan ke database');

  showSpinner('Menyimpan perubahan...', steps);
  let stepIdx = 0;

  try {
    setSpinnerStep(stepIdx++, steps.length); // Menyiapkan data

    let fd = null;
    if (hasMainFile) {
      setSpinnerStep(stepIdx++, steps.length);
      setSpinnerLabel('Membaca file lampiran...');
      fd = await readFileAsBase64(fileEl.files[0]);
    }

    if (t === 'Agenda') {
      if (hasSambutanFile) {
        setSpinnerStep(stepIdx++, steps.length);
        setSpinnerLabel('Membaca file sambutan...');
        payload.data.fileSambutan = await readFileAsBase64(fSambutanEl.files[0]);
      }
      if (hasSapaanFile) {
        setSpinnerStep(stepIdx++, steps.length);
        setSpinnerLabel('Membaca file sapaan...');
        payload.data.fileSapaan = await readFileAsBase64(fSapaanEl.files[0]);
      }
    }

    if (hasMainFile || hasSambutanFile || hasSapaanFile) {
      setSpinnerStep(stepIdx++, steps.length);
      setSpinnerLabel('Mengunggah file ke Drive...', 'Proses ini mungkin memakan waktu beberapa saat');
    } else {
      setSpinnerStep(stepIdx++, steps.length);
      setSpinnerLabel('Mengirim data ke server...');
    }

    const res = await callAPI('updateRow', { sheetName: t, id: payload.id, data: payload.data, fileData: fd });

    setSpinnerStep(stepIdx, steps.length);
    setSpinnerLabel('Menyimpan ke database...');
    finishSpinner(steps.length);
    await new Promise(function (r) { setTimeout(r, 300); });
    hideSpinner();

    if (res.success) {
      showToast('Data berhasil diperbarui!', 'success');
      closeEditModal();
      if (t === 'Arsip') loadArsip();
      else if (t === 'Surat Masuk') loadSuratMasuk();
      else if (t === 'Agenda') {
        // Sinkronisasi disposisi berdasarkan perubahan status
        const oldStatus = currentEditData.oriData ? currentEditData.oriData['Status Kehadiran'] : '';
        const newStatus = payload.data.statusKehadiran;
        const statusChanged = oldStatus !== newStatus;
        const isDisposisi = newStatus === 'Disposisi';
        const wasDisposisi = oldStatus === 'Disposisi';

        // Sync jika: status berubah, ATAU status tetap Disposisi (data mungkin berubah)
        if (statusChanged || isDisposisi) {
          try {
            await callAPI('syncAgendaDisposisi', {
              agendaId: payload.id,
              oldStatus: oldStatus,
              newStatus: newStatus,
              agendaData: {
                namaKegiatan: payload.data.namaKegiatan,
                tanggal: payload.data.tanggal || (currentEditData.oriData && currentEditData.oriData['Tanggal']) || '',
                waktu: payload.data.waktu,
                lokasi: payload.data.lokasi,
                pakaian: payload.data.pakaian,
                cpNama: payload.data.cpNama,
                cpNoWa: payload.data.cpNoWa,
                disposisiKepada: payload.data.disposisiKepada || '',
                disposisiDari: 'Bupati'
              }
            });
          } catch (syncErr) { console.warn('Sync disposisi error:', syncErr); }
        }
        loadAgenda();
        if (APP.currentPage === 'dashboard') loadDashboardCalendar();
        if (APP.currentPage === 'disposisi') loadDisposisi();
      }
      else if (t === 'Disposisi') {
        // Sinkronisasi balik ke Agenda jika ada Referensi Agenda ID
        const agendaId = payload.data.agendaId;
        if (agendaId && agendaId !== '-' && agendaId !== '') {
          try {
            await callAPI('syncDisposisiToAgenda', {
              agendaId: agendaId,
              data: {
                namaKegiatan: payload.data.namaKegiatan,
                tanggal: payload.data.tanggal,
                waktu: payload.data.waktu,
                lokasi: payload.data.lokasi,
                pakaian: payload.data.pakaian,
                cpNama: payload.data.cpNama,
                cpNoWa: payload.data.cpNoWa
              }
            });
          } catch (syncErr) { console.warn('Sync disposisi→agenda error:', syncErr); }
        }
        loadDisposisi();
        if (APP.currentPage === 'agenda') loadAgenda();
        if (APP.currentPage === 'dashboard') loadDashboardCalendar();
      }
    } else {
      showToast(res.message, 'error');
    }
  } catch (e) {
    hideSpinner(); showToast('Error: ' + e.message, 'error');
  }
}

