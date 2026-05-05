// ══════════════════════════════════════════════════════════
//  MODUL: ARSIP DIGITAL
// ══════════════════════════════════════════════════════════
async function submitArsip() {
  const nama = document.getElementById('arsip-nama').value.trim();
  const kategori = document.getElementById('arsip-kategori').value;
  const deskripsi = document.getElementById('arsip-deskripsi').value.trim();
  const tglArsip = document.getElementById('arsip-tgl').value;
  const fileEl = document.getElementById('arsip-file');

  if (!nama) { showToast('Nama file wajib diisi.', 'error'); return; }
  if (!kategori) { showToast('Kategori wajib dipilih.', 'error'); return; }
  if (!tglArsip) { showToast('Tanggal arsip wajib diisi.', 'error'); return; }
  if (!fileEl.files[0]) { showToast('File wajib diunggah.', 'error'); return; }

  showSpinner('Mengunggah arsip ke Google Drive...', ['Membaca file', 'Mengunggah ke Drive', 'Menyimpan data']);
  try {
    setSpinnerStep(0, 3);
    setSpinnerLabel('Membaca file...');
    const fd = await readFileAsBase64(fileEl.files[0]);
    setSpinnerStep(1, 3);
    setSpinnerLabel('Mengunggah ke Google Drive...', 'Proses ini mungkin memakan waktu beberapa saat');
    const res = await callAPI('saveArsip', { data: { namaFile: nama, kategori: kategori, deskripsi: deskripsi, tglArsip: tglArsip }, fileData: fd });
    finishSpinner(3);
    await new Promise(function (r) { setTimeout(r, 200); });
    hideSpinner();

    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['arsip-nama', 'arsip-deskripsi']);
      document.getElementById('arsip-kategori').value = '';
      fileEl.value = '';
      document.getElementById('arsip-file-info').textContent = '';
      togglePanel('arsip-form-panel');
      loadArsip();
    } else showToast(res.message, 'error');
  } catch (err) { hideSpinner(); showToast('Error: ' + err.message, 'error'); }
}

async function loadArsip() {
  try {
    const res = await callAPI('getArsip', {});
    const tbody = document.getElementById('arsip-tbody');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="10"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data arsip</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(function (d, i) {
      const safeData = encodeURIComponent(JSON.stringify(d));
      const tglArs = d['Tanggal Arsip'] ? fmtDate(d['Tanggal Arsip']) : '-';
      const url = d['URL'] || d['File URL'];
      const lampiran = url ? '<button class="btn-link-custom" style="padding:4px 10px;font-size:0.75rem" onclick="openFileViewer(\'' + url + '\', \'' + esc(d['Nama File']) + '\')"><i class="bi bi-eye"></i> Lihat</button>' : '<span style="color:var(--text-muted);font-size:.78rem">-</span>';

      return '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(d['Nama File']) + '</strong></td><td><span class="badge-cat arsip">' + esc(d['Kategori']) + '</span></td><td>' + esc(d['Folder']) + '</td><td>' + esc(d['Deskripsi']) + '</td><td>' + esc(d['Ukuran']) + '</td><td>' + tglArs + '</td><td>' + fmtDate(d['Dibuat Pada'] || d['DibuatPada'] || d['CreatedAt']) + '</td><td>' + lampiran + '</td><td class="action-col" style="display:flex;gap:6px"><button class="btn-warning-custom" onclick="openEditModal(\'Arsip\', \'' + safeData + '\')"><i class="bi bi-pencil"></i></button><button class="btn-danger-custom" onclick="deleteItem(\'deleteArsip\',\'' + d['ID'] + '\',loadArsip)"><i class="bi bi-trash"></i></button></td></tr>';
    }).join('');
  } catch (err) {
    showToast('Gagal memuat arsip: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  MODUL: SURAT MASUK
// ══════════════════════════════════════════════════════════
async function submitSuratMasuk() {
  const data = {
    nomorSurat: v('sm-nomor'),
    tanggal: v('sm-tanggal'),
    pengirim: v('sm-pengirim'),
    perihal: v('sm-perihal'),
    kategori: v('sm-kategori'),
    catatan: v('sm-catatan')
  };

  if (!data.nomorSurat || !data.tanggal || !data.pengirim || !data.perihal) {
    showToast('Lengkapi field yang wajib diisi.', 'error');
    return;
  }

  showSpinner('Menyimpan surat masuk...');
  try {
    const fileEl = document.getElementById('sm-file');
    const fd = fileEl.files[0] ? await readFileAsBase64(fileEl.files[0]) : null;
    if (fd) setSpinnerLabel('Mengunggah lampiran...', 'Proses ini mungkin memakan waktu beberapa saat');
    const res = await callAPI('saveSuratMasuk', { data: data, fileData: fd });
    hideSpinner();
    if (res.success) {
      showToast(res.message, 'success');
      resetFields(['sm-nomor', 'sm-tanggal', 'sm-pengirim', 'sm-perihal', 'sm-catatan']);
      fileEl.value = '';
      document.getElementById('sm-file-info').textContent = '';
      togglePanel('form-masuk');
      loadSuratMasuk();
    } else showToast(res.message, 'error');
  } catch (err) {
    hideSpinner(); showToast('Error: ' + err.message, 'error');
  }
}

async function loadSuratMasuk() {
  try {
    const res = await callAPI('getSuratMasuk', {});
    renderSuratTable('tbody-sm', res, ['Nomor Surat', 'Tanggal', 'Pengirim', 'Perihal', 'Kategori'], 'masuk', 'deleteSuratMasuk', loadSuratMasuk);
  } catch (err) { console.warn('Surat Masuk load error:', err); }
}

