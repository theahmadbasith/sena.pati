const fs = require('fs');
const file = 'c:/Users/User/Downloads/simadun-main (1)/simadun-main/public/app/index.html';
let content = fs.readFileSync(file, 'utf8');

const startSurat = content.indexOf('<!-- SURAT -->');
const startPanduan = content.indexOf('<!-- PANDUAN TEKNIS -->');

if (startSurat !== -1 && startPanduan !== -1) {
    const replacement = `
      <!-- AGENDA KEGIATAN -->
      <div id="page-agenda" class="view">
        <div class="page-header">
          <div>
            <h1>Agenda Kegiatan</h1>
            <p>Kelola daftar agenda kegiatan Bupati Ponorogo</p>
          </div>
          <button class="btn-primary-custom" onclick="togglePanel('form-agenda')"><i class="bi bi-calendar-plus"></i> Tambah Agenda</button>
        </div>
        <div class="panel" id="form-agenda" style="display:none">
          <div class="panel-header">
            <h3><i class="bi bi-calendar-event" style="color:var(--primary)"></i> Form Agenda Kegiatan</h3>
            <button onclick="togglePanel('form-agenda')" style="background:none;border:none;cursor:pointer;font-size:1.2rem"><i class="bi bi-x"></i></button>
          </div>
          <div class="panel-body">
            <div class="form-row">
              <div class="form-group"><label>Nomor Surat Ref</label><input type="text" class="form-control-custom" id="ag-nomor" placeholder="Cth: 005/123/2026" /></div>
              <div class="form-group"><label>Nama Kegiatan *</label><input type="text" class="form-control-custom" id="ag-nama" placeholder="Nama kegiatan" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Lokasi</label><input type="text" class="form-control-custom" id="ag-lokasi" placeholder="Lokasi kegiatan" /></div>
              <div class="form-group"><label>Waktu</label><input type="text" class="form-control-custom" id="ag-waktu" placeholder="Cth: 08:00 - Selesai" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Pakaian</label><input type="text" class="form-control-custom" id="ag-pakaian" placeholder="Atribut pakaian" /></div>
              <div class="form-group"><label>Transit</label><input type="text" class="form-control-custom" id="ag-transit" placeholder="Info transit" /></div>
            </div>
            <div class="form-group"><label>Keterangan (Hiburan, Cenderamata, dll)</label><textarea class="form-control-custom" id="ag-keterangan" rows="2"></textarea></div>
            <div class="form-group">
              <label>Status Kehadiran *</label>
              <select class="form-control-custom" id="ag-status" onchange="toggleDisposisiField()">
                <option value="Hadir">Hadir</option>
                <option value="Tidak Hadir">Tidak Hadir</option>
                <option value="Disposisi">Disposisi</option>
              </select>
            </div>
            <div class="form-group" id="ag-disposisi-card" style="display:none; background:rgba(217, 119, 6, 0.1); padding:15px; border-radius:8px; border:1px solid rgba(217,119,6,0.3)">
               <label style="color:#b45309"><strong>Didisposisikan Kepada (Wajib isi jika status Disposisi)</strong></label>
               <input type="text" class="form-control-custom" id="ag-disposisikepada" placeholder="Cth: Asisten 1, Kadisdik..." />
               <label style="margin-top:10px; color:#b45309"><strong>Instruksi Disposisi</strong></label>
               <input type="text" class="form-control-custom" id="ag-instruksi" placeholder="Instruksi kepada penerima disposisi" />
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:15px">
              <button class="btn-link-custom" onclick="togglePanel('form-agenda')">Batal</button>
              <button class="btn-primary-custom" onclick="submitAgenda()"><i class="bi bi-save"></i> Simpan</button>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <h3><i class="bi bi-table"></i> Daftar Agenda Kegiatan</h3>
            <div class="search-bar"><i class="bi bi-search"></i><input type="text" placeholder="Cari agenda..." oninput="filterTable('table-ag',this.value)" /></div>
          </div>
          <div class="custom-table-wrap">
            <table class="custom-table" id="table-ag">
              <thead><tr><th>#</th><th>Referensi</th><th>Kegiatan</th><th>Waktu & Lokasi</th><th>Pakaian</th><th>Status</th><th class="action-col">Aksi</th></tr></thead>
              <tbody id="tbody-ag"><tr class="no-data"><td colspan="7"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>Belum ada data</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- UNDANGAN -->
      <div id="page-undangan" class="view">
        <div class="page-header">
          <div>
            <h1>Kelola Undangan</h1>
            <p>Manajemen surat undangan dan konversi ke Agenda</p>
          </div>
          <button class="btn-primary-custom" onclick="togglePanel('form-undangan')"><i class="bi bi-plus-lg"></i> Tambah Undangan</button>
        </div>
        <div class="panel" id="form-undangan" style="display:none">
          <div class="panel-header">
            <h3><i class="bi bi-calendar-event" style="color:var(--success)"></i> Form Undangan</h3>
            <button onclick="togglePanel('form-undangan')" style="background:none;border:none;cursor:pointer"><i class="bi bi-x"></i></button>
          </div>
          <div class="panel-body">
            <div class="form-row">
              <div class="form-group"><label>Nomor Surat *</label><input type="text" class="form-control-custom" id="ud-nomor" placeholder="No. surat" /></div>
              <div class="form-group"><label>Tanggal *</label><input type="date" class="form-control-custom" id="ud-tanggal" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Penyelenggara *</label><input type="text" class="form-control-custom" id="ud-penyelenggara" placeholder="Instansi/Penyelenggara" /></div>
              <div class="form-group"><label>Lokasi</label><input type="text" class="form-control-custom" id="ud-lokasi" placeholder="Tempat acra" /></div>
            </div>
            <div class="form-group"><label>Perihal *</label><input type="text" class="form-control-custom" id="ud-perihal" placeholder="Perihal acara" /></div>
            <div class="form-group"><label>Catatan</label><textarea class="form-control-custom" id="ud-catatan" rows="2"></textarea></div>
            <div class="form-group">
              <label>Lampiran</label>
              <div class="file-drop" id="ud-drop">
                <input type="file" id="ud-file" onchange="handleFileSelect('ud-file','ud-file-info')" />
                <div class="drop-icon"><i class="bi bi-paperclip"></i></div>
                <div class="drop-text">Upload lampiran (opsional)</div>
                <div class="drop-name" id="ud-file-info"></div>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn-link-custom" onclick="togglePanel('form-undangan')">Batal</button><button class="btn-primary-custom" onclick="submitUndangan()"><i class="bi bi-save"></i> Simpan</button></div>
          </div>
        </div>
        <div class="panel">
           <div class="panel-header">
              <h3><i class="bi bi-list-stars"></i> Daftar Undangan</h3>
              <div class="search-bar"><i class="bi bi-search"></i><input type="text" placeholder="Cari undangan..." oninput="filterTable('table-ud',this.value)" /></div>
           </div>
           <div class="custom-table-wrap">
              <table class="custom-table" id="table-ud">
                <thead><tr><th>#</th><th>No. Surat</th><th>Penyelenggara</th><th>Perihal</th><th>Pelaksanaan</th><th class="action-col" style="min-width:140px">Aksi</th></tr></thead>
                <tbody id="tbody-ud"></tbody>
              </table>
           </div>
        </div>
      </div>

      <!-- SURAT MASUK/KELUAR -->
      <div id="page-surat" class="view">
        <div class="page-header">
          <div>
            <h1>Administrasi Surat</h1>
            <p>Kelola surat masuk dan keluar</p>
          </div>
        </div>
        <div class="custom-tabs">
          <button class="custom-tab active" id="tab-masuk" onclick="setTab('tab-masuk')"><i class="bi bi-envelope-arrow-down"></i> Masuk</button>
          <button class="custom-tab" id="tab-keluar" onclick="setTab('tab-keluar')"><i class="bi bi-envelope-arrow-up"></i> Keluar</button>
        </div>
        <!-- content-masuk -->
        <div id="content-masuk" class="tab-content">
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn-primary-custom" onclick="togglePanel('form-masuk')">Tambah Surat Masuk</button></div>
          <div class="panel" id="form-masuk" style="display:none">
            <div class="panel-body">
              <div class="form-row">
                 <div class="form-group"><label>Nomor Surat *</label><input type="text" id="sm-nomor" class="form-control-custom" /></div>
                 <div class="form-group"><label>Tanggal *</label><input type="date" id="sm-tanggal" class="form-control-custom" /></div>
              </div>
              <div class="form-group"><label>Pengirim *</label><input type="text" id="sm-pengirim" class="form-control-custom" /></div>
              <div class="form-group"><label>Perihal *</label><input type="text" id="sm-perihal" class="form-control-custom" /></div>
              <div class="form-group">
                 <label>Lampiran</label>
                 <div class="file-drop" id="sm-drop"><input type="file" id="sm-file" onchange="handleFileSelect('sm-file','sm-file-info')" /><div class="drop-name" id="sm-file-info">Upload File</div></div>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn-primary-custom" onclick="submitSuratMasuk()">Simpan</button></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Surat Masuk</h3><div class="search-bar"><input type="text" oninput="filterTable('table-sm',this.value)" placeholder="Cari"/></div></div>
            <table class="custom-table" id="table-sm"><thead><tr><th>#</th><th>Nomor</th><th>Pengirim</th><th>Perihal</th><th>Aksi</th></tr></thead><tbody id="tbody-sm"></tbody></table>
          </div>
        </div>
        <!-- content-keluar -->
        <div id="content-keluar" class="tab-content" style="display:none">
          <div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn-primary-custom" onclick="togglePanel('form-keluar')">Tambah Surat Keluar</button></div>
          <div class="panel" id="form-keluar" style="display:none">
            <div class="panel-body">
              <div class="form-row">
                 <div class="form-group"><label>Nomor Surat *</label><input type="text" id="sk-nomor" class="form-control-custom" /></div>
                 <div class="form-group"><label>Tanggal *</label><input type="date" id="sk-tanggal" class="form-control-custom" /></div>
              </div>
              <div class="form-group"><label>Tujuan *</label><input type="text" id="sk-tujuan" class="form-control-custom" /></div>
              <div class="form-group"><label>Perihal *</label><input type="text" id="sk-perihal" class="form-control-custom" /></div>
              <div class="form-group">
                 <label>Lampiran</label>
                 <div class="file-drop" id="sk-drop"><input type="file" id="sk-file" onchange="handleFileSelect('sk-file','sk-file-info')" /><div class="drop-name" id="sk-file-info">Upload File</div></div>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn-primary-custom" onclick="submitSuratKeluar()">Simpan</button></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Surat Keluar</h3><div class=\"search-bar\"><input type="text" oninput="filterTable('table-sk',this.value)" placeholder="Cari"/></div></div>
            <table class="custom-table" id="table-sk"><thead><tr><th>#</th><th>Nomor</th><th>Tujuan</th><th>Perihal</th><th>Aksi</th></tr></thead><tbody id="tbody-sk"></tbody></table>
          </div>
        </div>
      </div>

      <!-- DISPOSISI -->
      <div id="page-disposisi" class="view">
        <div class="page-header">
          <div>
            <h1>Sistem Disposisi</h1>
            <p>Pantau aliran disposisi pimpinan</p>
          </div>
          <button class="btn-primary-custom" onclick="togglePanel('form-disposisi')"><i class="bi bi-plus-lg"></i> Tambah Manual</button>
        </div>
        <div class="panel" id="form-disposisi" style="display:none">
          <div class="panel-header"><h3>Beri Disposisi</h3><button onclick="togglePanel('form-disposisi')" style="background:none;border:none"><i class="bi bi-x" style="font-size:1.5rem"></i></button></div>
          <div class="panel-body">
            <div class="form-group"><label>Referensi / No Surat</label><input type="text" class="form-control-custom" id="disp-ref" /></div>
            <div class="form-row">
               <div class="form-group"><label>Dari</label><input type="text" class="form-control-custom" id="disp-dari" value="Bupati" /></div>
               <div class="form-group"><label>Kepada *</label><input type="text" class="form-control-custom" id="disp-kepada" /></div>
            </div>
            <div class="form-group"><label>Instruksi *</label><textarea class="form-control-custom" id="disp-instruksi" rows="3"></textarea></div>
            <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn-primary-custom" onclick="submitDisposisi()">Simpan</button></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Daftar Disposisi</h3><div class="search-bar"><input type="text" oninput="filterTable('table-disp',this.value)" placeholder="Cari..."/></div></div>
          <table class="custom-table" id="table-disp"><thead><tr><th>#</th><th>Tanggal</th><th>Dari</th><th>Kepada</th><th>Instruksi</th><th>Ref Agenda</th><th>Status</th><th class="action-col">Aksi</th></tr></thead><tbody id="tbody-disp"></tbody></table>
        </div>
      </div>

      <!-- SURAT TUGAS -->
      <div id="page-surattugas" class="view">
        <div class="page-header"><div><h1>Surat Tugas</h1><p>Kelola penerbitan Surat Tugas</p></div></div>
        <div class="panel">
          <div class="panel-header"><h3>Surat Tugas</h3><button class="btn-primary-custom" onclick="togglePanel('form-st')"><i class="bi bi-plus"></i> Tambah</button></div>
          <div class="panel-body" id="form-st" style="display:none">
             <div class="form-row">
               <div class="form-group"><label>Nomor ST *</label><input type="text" id="st-nomor" class="form-control-custom" /></div>
               <div class="form-group"><label>Nama Bertugas *</label><input type="text" id="st-nama" class="form-control-custom" /></div>
             </div>
             <div class="form-row">
               <div class="form-group"><label>NIP</label><input type="text" id="st-nip" class="form-control-custom" /></div>
               <div class="form-group"><label>Jabatan</label><input type="text" id="st-jabatan" class="form-control-custom" /></div>
             </div>
             <div class="form-group"><label>Tujuan & Keperluan *</label><input type="text" id="st-tujuan" class="form-control-custom" placeholder="Lokasi / Kegiatan" /></div>
             <div class="form-row">
               <div class="form-group"><label>Mulai</label><input type="date" id="st-mulai" class="form-control-custom" /></div>
               <div class="form-group"><label>Selesai</label><input type="date" id="st-selesai" class="form-control-custom" /></div>
             </div>
             <div class="form-group"><label>Lampiran</label><div class="file-drop" id="st-drop"><input type="file" id="st-file" onchange="handleFileSelect('st-file','st-file-info')" /><div class="drop-name" id="st-file-info">Upload PDF</div></div></div>
             <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn-primary-custom" onclick="submitSPT('SURAT_TUGAS')">Simpan Surat Tugas</button></div>
          </div>
          <table class="custom-table" id="table-st"><thead><tr><th>#</th><th>Nomor</th><th>Nama</th><th>Tujuan</th><th>Pelaksanaan</th><th>Aksi</th></tr></thead><tbody id="tbody-st"></tbody></table>
        </div>
      </div>

      <!-- SURAT PERINTAH -->
      <div id="page-suratperintah" class="view">
        <div class="page-header"><div><h1>Surat Perintah</h1><p>Kelola penerbitan Surat Perintah</p></div></div>
        <div class="panel">
          <div class="panel-header"><h3>Surat Perintah</h3><button class="btn-primary-custom" onclick="togglePanel('form-sp')"><i class="bi bi-plus"></i> Tambah</button></div>
          <div class="panel-body" id="form-sp" style="display:none">
             <div class="form-row">
               <div class="form-group"><label>Nomor SP *</label><input type="text" id="sp-nomor" class="form-control-custom" /></div>
               <div class="form-group"><label>Nama Diperintah *</label><input type="text" id="sp-nama" class="form-control-custom" /></div>
             </div>
             <div class="form-row">
               <div class="form-group"><label>NIP</label><input type="text" id="sp-nip" class="form-control-custom" /></div>
               <div class="form-group"><label>Jabatan</label><input type="text" id="sp-jabatan" class="form-control-custom" /></div>
             </div>
             <div class="form-group"><label>Perintah Kepada *</label><input type="text" id="sp-tujuan" class="form-control-custom" placeholder="Instruksi perintah" /></div>
             <div class="form-row">
               <div class="form-group"><label>Mulai</label><input type="date" id="sp-mulai" class="form-control-custom" /></div>
               <div class="form-group"><label>Selesai</label><input type="date" id="sp-selesai" class="form-control-custom" /></div>
             </div>
             <div class="form-group"><label>Lampiran</label><div class="file-drop" id="sp-drop"><input type="file" id="sp-file" onchange="handleFileSelect('sp-file','sp-file-info')" /><div class="drop-name" id="sp-file-info">Upload PDF</div></div></div>
             <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn-primary-custom" onclick="submitSPT('SURAT_PERINTAH')">Simpan Surat Perintah</button></div>
          </div>
          <table class="custom-table" id="table-sp"><thead><tr><th>#</th><th>Nomor</th><th>Nama</th><th>Perintah</th><th>Pelaksanaan</th><th>Aksi</th></tr></thead><tbody id="tbody-sp"></tbody></table>
        </div>
      </div>
      <!-- PANDUAN TEKNIS -->`;

    const newContent = content.substring(0, startSurat) + replacement + content.substring(startPanduan + 25);
    fs.writeFileSync(file, newContent);
    console.log('HTML Replaced Successfully.');
} else {
    console.log('Markers not found!');
}
