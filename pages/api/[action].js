// pages/api/[action].js
import { google } from 'googleapis';
import crypto from 'crypto';

/**
 * SENAPATI - Sentral Navigasi Pengelolaan Agenda dan Tata Informasi Bupati Ponorogo
 * Vercel Backend API Routes
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const CONFIG = {
  SHEETS: {
    USERS: 'Users',
    SURAT_MASUK: 'Surat Masuk',
    AGENDA: 'Agenda',
    DISPOSISI: 'Disposisi',
    ARSIP: 'Arsip',
    TEMPLATE_SURAT: 'Template Surat',
    PETA_DRAWINGS: 'Peta Drawings',
    AJUDAN: 'Ajudan',
    PEJABAT_DISPOSISI: 'Pejabat Disposisi'
  }
};

const ARSIP_SALT = 'ARSIP_SALT_2024';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CLIENT — cached per process (warm lambda reuse)
// ─────────────────────────────────────────────────────────────────────────────
let _cachedAuthClient = null;

async function getAuthClient() {
  if (_cachedAuthClient) return _cachedAuthClient;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is missing');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ]
  });
  _cachedAuthClient = await auth.getClient();
  return _cachedAuthClient;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const payload = req.body.payload || {};

  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is missing');

    let result;
    switch (action) {
      case 'login':
        result = await loginUser(sheets, spreadsheetId, payload.username, payload.password); break;
      case 'getDashboard':
        result = await getDashboardData(sheets, spreadsheetId); break;
      case 'setupDatabase':
        result = await setupDb(sheets, spreadsheetId); break;

      // ── ARSIP ──
      case 'saveArsip':
        result = await saveArsip(sheets, drive, spreadsheetId, rootFolderId, payload.data, payload.fileData); break;
      case 'getArsip':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.ARSIP); break;
      case 'deleteArsip':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.ARSIP, payload.id); break;

      // ── SURAT MASUK ──
      case 'saveSuratMasuk':
        result = await saveSurat(sheets, drive, spreadsheetId, rootFolderId, CONFIG.SHEETS.SURAT_MASUK, 'Surat Masuk', payload.data, payload.fileData); break;
      case 'getSuratMasuk':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.SURAT_MASUK); break;
      case 'deleteSuratMasuk':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.SURAT_MASUK, payload.id); break;

      // ── AGENDA ──
      case 'saveAgenda':
        result = await saveAgenda(sheets, drive, spreadsheetId, rootFolderId, payload.data, payload.fileData); break;
      case 'getAgenda':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.AGENDA); break;
      case 'deleteAgenda':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.AGENDA, payload.id); break;

      // ── DISPOSISI ──
      case 'saveDisposisi':
        result = await saveDisposisi(sheets, spreadsheetId, payload.data); break;
      case 'getDisposisi':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.DISPOSISI); break;
      case 'deleteDisposisi':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.DISPOSISI, payload.id); break;
      case 'syncAgendaDisposisi':
        result = await syncAgendaDisposisi(sheets, drive, spreadsheetId, rootFolderId, payload); break;
      case 'selesaiDisposisi':
        result = await selesaiDisposisi(sheets, drive, spreadsheetId, rootFolderId, payload); break;
      case 'syncDisposisiToAgenda':
        result = await syncDisposisiToAgenda(sheets, spreadsheetId, payload); break;

      // ── USERS ──
      case 'getUsers':
        result = await getUsers(sheets, spreadsheetId); break;
      case 'addUser':
        result = await addUser(sheets, spreadsheetId, payload.data); break;
      case 'deleteUser':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.USERS, payload.id); break;
      case 'changePassword':
        result = await changePassword(sheets, spreadsheetId, payload.username, payload.oldPassword, payload.newPassword); break;
      case 'updateUserWA':
        result = await updateUserWA(sheets, spreadsheetId, payload.id, payload.noWa); break;

      // ── AJUDAN ──
      case 'getAjudan':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.AJUDAN); break;
      case 'saveAjudan':
        result = await saveAjudan(sheets, spreadsheetId, payload.data); break;
      case 'updateAjudan':
        result = await updateAjudan(sheets, spreadsheetId, payload.id, payload.data); break;
      case 'deleteAjudan':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.AJUDAN, payload.id); break;

      // ── PEJABAT DISPOSISI ──
      case 'getPejabatDisposisi':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.PEJABAT_DISPOSISI); break;
      case 'savePejabatDisposisi':
        result = await savePejabatDisposisi(sheets, spreadsheetId, payload.data); break;
      case 'updatePejabatDisposisi':
        result = await updatePejabatDisposisi(sheets, spreadsheetId, payload.id, payload.data); break;
      case 'deletePejabatDisposisi':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.PEJABAT_DISPOSISI, payload.id); break;

      // ── TEMPLATE SURAT ──
      case 'saveTemplate':
        result = await saveTemplate(sheets, drive, spreadsheetId, rootFolderId, payload.data, payload.fileData); break;
      case 'getTemplates':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.TEMPLATE_SURAT); break;
      case 'deleteTemplate':
        result = await deleteTemplate(sheets, drive, spreadsheetId, payload.id); break;
      case 'parseTemplate':
        result = await parseTemplateVariables(sheets, spreadsheetId, payload.templateId); break;
      case 'updateTemplateVars':
        result = await updateTemplateVars(sheets, spreadsheetId, payload.id, payload.variables); break;



      // ── PETA DRAWINGS ──
      case 'saveMapDrawings':
        result = await saveMapDrawings(sheets, spreadsheetId, payload.drawings); break;
      case 'getMapDrawings':
        result = await getMapDrawings(sheets, spreadsheetId); break;
      case 'clearMapDrawings':
        result = await clearMapDrawings(sheets, spreadsheetId); break;

      case 'downloadDriveProxy': {
        if (!payload.url) return res.status(400).json({ success: false, message: 'URL required' });
        try {
          // Ekstrak file ID dari URL Google Drive (berbagai format)
          let fileId = '';
          const idMatch = payload.url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || payload.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (idMatch) fileId = idMatch[1];

          if (fileId) {
            // Gunakan Drive API dengan Service Account (lebih andal, tidak ada redirect)
            const authClient = await getAuthClient();
            const driveClient = google.drive({ version: 'v3', auth: authClient });
            const fileStream = await driveClient.files.get(
              { fileId, alt: 'media', supportsAllDrives: true },
              { responseType: 'stream' }
            );
            res.setHeader('Content-Type', fileStream.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment');
            return fileStream.data.pipe(res);
          }

          // Fallback: fetch publik (untuk URL non-Drive)
          const proxyRes = await fetch(payload.url, { redirect: 'follow' });
          if (!proxyRes.ok) throw new Error('HTTP ' + proxyRes.status);
          const arrayBuffer = await proxyRes.arrayBuffer();
          res.setHeader('Content-Type', proxyRes.headers.get('content-type') || 'application/octet-stream');
          return res.send(Buffer.from(arrayBuffer));
        } catch (e) {
          console.error('downloadDriveProxy error:', e);
          return res.status(500).json({ success: false, message: 'Gagal mengunduh file: ' + e.message });
        }
      }

      // ── SYSTEM ──
      case 'setupDb':
        result = await setupDb(sheets, spreadsheetId); break;
      case 'updateRow':
        result = await updateRowAndFile(sheets, drive, spreadsheetId, rootFolderId, payload.sheetName, payload.id, payload.data, payload.fileData); break;
      default:
        return res.status(404).json({ success: false, message: `Unknown action: ${action}` });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function hashPassword(p) { return crypto.createHash('sha256').update(p + ARSIP_SALT).digest('hex'); }
function generateId() { return 'ID' + Date.now() + Math.floor(Math.random() * 9999); }

/** Format tanggal untuk disimpan ke sheet: dd/MM/yyyy HH:mm (WIB) */
function fmtDateSheet(date) {
  const d = date || new Date();
  // Offset WIB = UTC+7
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(wib.getUTCDate()).padStart(2, '0');
  const mm = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = wib.getUTCFullYear();
  const hh = String(wib.getUTCHours()).padStart(2, '0');
  const min = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getSheetData(sheets, spreadsheetId, sheetName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:Z` });
  const rows = res.data.values || [];
  if (rows.length === 0) return { success: true, data: [] };
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || '');
    return obj;
  });
  return { success: true, data };
}

async function deleteRowById(sheets, spreadsheetId, sheetName, id) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
  const rows = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Data tidak ditemukan' };
  const ss = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = ss.data.sheets.find(s => s.properties.title === sheetName);
  const sheetId = sheet.properties.sheetId;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: index, endIndex: index + 1 } } }] } });
  return { success: true, message: 'Data berhasil dihapus' };
}

async function uploadToDrive(drive, rootFolderId, folderName, fileData) {
  if (!fileData || !fileData.content) return { url: '', name: '', id: '' };

  // Selalu gunakan Service Account (googleapis) sebagai jalur utama upload.
  // Apps Script hanya sebagai fallback opsional jika APPS_SCRIPT_URL diset.
  try {
    const listRes = await drive.files.list({
      q: `name = '${folderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    let folderId;
    if (listRes.data.files && listRes.data.files.length > 0) {
      folderId = listRes.data.files[0].id;
    } else {
      const createRes = await drive.files.create({
        resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [rootFolderId] },
        fields: 'id',
        supportsAllDrives: true
      });
      folderId = createRes.data.id;
    }

    const buffer = Buffer.from(fileData.content, 'base64');
    const fileRes = await drive.files.create({
      resource: { name: fileData.name, parents: [folderId] },
      media: { mimeType: fileData.mimeType, body: require('stream').Readable.from(buffer) },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true
    });

    // Berikan akses read publik agar file bisa di-proxy-download
    await drive.permissions.create({
      fileId: fileRes.data.id,
      resource: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true
    });

    const fileId = fileRes.data.id;
    // Gunakan URL download langsung (uc?export=download) agar proxy dapat mengunduh binary-nya
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;

    return { url: downloadUrl, viewUrl, name: fileRes.data.name, id: fileId };
  } catch (e) {
    // Jika Service Account gagal (misal quota habis), coba Apps Script jika ada
    if (process.env.APPS_SCRIPT_URL) {
      try {
        const resp = await fetch(process.env.APPS_SCRIPT_URL, {
          method: 'POST', headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ folderId: rootFolderId, folderName, fileData })
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        const fileIdMatch = (data.url || '').match(/\/d\/([a-zA-Z0-9_-]+)/);
        const fileId = data.id || (fileIdMatch ? fileIdMatch[1] : '');
        const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : data.url;
        return { url: downloadUrl, viewUrl: data.url, name: fileData.name, id: fileId };
      } catch (err) {
        throw new Error(`SA Error: ${e.message} | GAS Error: ${err.message}`);
      }
    } else {
      throw new Error(`SA Error: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NEON DB HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getPgClient() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Please add your Neon DB connection string.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  return pool;
}

async function uploadToPostgres(id, fileData) {
  if (!fileData || !fileData.content) return { url: '', name: '', id: '' };
  const pool = await getPgClient();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(50) PRIMARY KEY,
        file_name VARCHAR(255),
        file_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(
      `INSERT INTO templates (id, file_name, file_content) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET file_name = EXCLUDED.file_name, file_content = EXCLUDED.file_content, created_at = CURRENT_TIMESTAMP`,
      [id, fileData.name, fileData.content]
    );

    const downloadUrl = `/api/downloadTemplateDB?id=${id}`;
    return { url: downloadUrl, viewUrl: downloadUrl, name: fileData.name, id: id };
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS LOGIC
// ─────────────────────────────────────────────────────────────────────────────
async function loginUser(sheets, spreadsheetId, username, password) {
  const data = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  if (!data.success) return data;
  const hashed = hashPassword(password);
  const user = data.data.find(u => u.Username === username && u.Password === hashed);
  if (user) return { success: true, message: 'Login berhasil', user: { id: user.ID, username: user.Username, nama: user.Nama, role: user.Role, noWa: user['No WA'] ? String(user['No WA']).replace(/^'/, '') : '' } };
  return { success: false, message: 'Username atau password salah.' };
}

async function getDashboardData(sheets, spreadsheetId) {
  const getCount = async (sheetName) => {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
      return res.data.values ? Math.max(0, res.data.values.length - 1) : 0;
    } catch (e) { return 0; }
  };

  // Jalankan semua fetch secara paralel
  const [arsipRes, agendaRes, suratMasukCount, disposisiCount] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.ARSIP}!A:K` }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.AGENDA}!A:Z` }),
    getCount(CONFIG.SHEETS.SURAT_MASUK),
    getCount(CONFIG.SHEETS.DISPOSISI),
  ]);

  // Arsip category breakdown
  const arsipRows = arsipRes.data.values || [];
  const arsipHdr = arsipRows[0] || [];
  const catIdx = arsipHdr.indexOf('Kategori');
  const arsipData = arsipRows.slice(1);
  const counts = { KPT: 0, INS: 0, PERBUP: 0, SEB: 0, NDI: 0, MEM: 0, MISC: 0 };
  arsipData.forEach(row => {
    const cat = row[catIdx] || '';
    if (cat === 'Keputusan Bupati') counts.KPT++;
    else if (cat === 'Instruksi Bupati') counts.INS++;
    else if (cat === 'Peraturan Bupati') counts.PERBUP++;
    else if (cat.includes('Surat Edaran')) counts.SEB++;
    else if (cat === 'Nota Dinas') counts.NDI++;
    else if (cat.includes('Disposisi') || cat.includes('Memo')) counts.MEM++;
    else counts.MISC++;
  });

  // Agenda breakdown
  const agendaRows = agendaRes.data.values || [];
  const agendaHdr = agendaRows[0] || [];
  const tglIdx = agendaHdr.indexOf('Tanggal');
  let agendaHariIni = 0;
  let agendaBesok = 0;
  let agendaMingguIni = 0;

  if (tglIdx !== -1) {
    const tzOffset = 7 * 60 * 60000;
    const localToday = new Date(Date.now() + tzOffset);
    const todayStr = localToday.toISOString().split('T')[0];
    const tomorrowStr = new Date(localToday.getTime() + 86400000).toISOString().split('T')[0];
    const weekEndStr = new Date(localToday.getTime() + 6 * 86400000).toISOString().split('T')[0];

    agendaRows.slice(1).forEach(row => {
      const tgl = row[tglIdx] ? row[tglIdx].split('T')[0] : '';
      if (tgl === todayStr) agendaHariIni++;
      else if (tgl === tomorrowStr) agendaBesok++;
      if (tgl >= todayStr && tgl <= weekEndStr) agendaMingguIni++;
    });
  }

  return {
    success: true,
    suratMasuk: suratMasukCount,
    agenda: Math.max(0, agendaRows.length - 1),
    agendaHariIni,
    agendaBesok,
    agendaMingguIni,
    disposisi: disposisiCount,
    arsip: arsipData.length,
    suratMasukCount,
    countKpt: counts.KPT,
    countIns: counts.INS,
    countPerbup: counts.PERBUP,
    countSeb: counts.SEB,
    countNdi: counts.NDI,
    countMem: counts.MEM,
    countMisc: counts.MISC
  };
}

async function saveArsip(sheets, drive, spreadsheetId, rootFolderId, data, fileData) {
  const folderName = data.kategori || 'Dokumentasi';
  const file = await uploadToDrive(drive, rootFolderId, folderName, fileData);
  const id = generateId();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.ARSIP}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, data.namaFile, data.kategori, folderName, file.url, file.name, file.id, data.deskripsi || '-', fileData.size || '-', fmtDateSheet(), data.tglArsip || fmtDateSheet()]] }
  });
  return { success: true, message: 'Arsip berhasil diunggah', id };
}

async function saveSurat(sheets, drive, spreadsheetId, rootFolderId, sheetName, folderName, data, fileData) {
  const file = await uploadToDrive(drive, rootFolderId, folderName, fileData);
  const id = generateId();
  let row;
  if (sheetName === CONFIG.SHEETS.SURAT_MASUK) {
    row = [id, data.nomorSurat, data.tanggal, data.pengirim, data.perihal, data.kategori || 'Umum', file.url, file.name, file.id, data.catatan || '-', fmtDateSheet()];
  } else {
    row = [id, data.nomorSurat, data.tanggal, data.tujuan, data.perihal, data.kategori || 'Umum', file.url, file.name, file.id, data.catatan || '-', fmtDateSheet()];
  }
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${sheetName}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [row] } });
  return { success: true, message: 'Data berhasil disimpan', id };
}

async function saveAgenda(sheets, drive, spreadsheetId, rootFolderId, data, fileData) {
  // Upload file lampiran utama
  const file = await uploadToDrive(drive, rootFolderId, 'Agenda', fileData);
  // Upload file sambutan (jika ada)
  const fileSambutan = await uploadToDrive(drive, rootFolderId, 'Agenda/Sambutan', data.fileSambutan || null);
  // Upload file sapaan (jika ada)
  const fileSapaan = await uploadToDrive(drive, rootFolderId, 'Agenda/Sapaan', data.fileSapaan || null);

  const id = generateId();
  // Schema: ID | Nama Kegiatan | Tanggal | Lokasi | Waktu | Pakaian | Transit |
  //         Keterangan | Status Kehadiran | Sambutan | Sapaan | Latitude | Longitude |
  //         CP Nama | CP No WA | URL | Nama File | File ID |
  //         URL Sambutan | File ID Sambutan | URL Sapaan | File ID Sapaan | Dibuat Pada
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.AGENDA}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[
      id,
      data.namaKegiatan,
      data.tanggal || '-',
      data.lokasi || '-',
      data.waktu || '-',
      data.pakaian || '-',
      data.transit || '-',
      data.keterangan || '-',
      data.statusKehadiran || 'Hadir',
      data.sambutan || '',
      data.sapaan || '',
      data.latitude || '',
      data.longitude || '',
      data.cpNama || '',
      data.cpNoWa ? "'" + data.cpNoWa : '',
      file.url,
      file.name,
      file.id,
      fileSambutan.url || '',
      fileSambutan.id || '',
      fileSapaan.url || '',
      fileSapaan.id || '',
      fmtDateSheet()
    ]] }
  });
  if (data.statusKehadiran === 'Disposisi' && data.disposisiKepada) {
    const dispId = generateId();
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A1`, valueInputOption: 'USER_ENTERED',
      resource: { values: [[
        dispId, id,
        data.disposisiDari || 'Bupati',
        data.disposisiKepada,
        data.tanggal || fmtDateSheet(),
        'Diproses',
        fmtDateSheet(),
        data.namaKegiatan || '',
        data.waktu || '',
        data.lokasi || '',
        data.pakaian || '',
        data.cpNama || '',
        data.cpNoWa ? "'" + data.cpNoWa : ''
      ]] }
    });
  }
  return { success: true, message: 'Agenda berhasil disimpan', id };
}

async function saveDisposisi(sheets, spreadsheetId, data) {
  const id = generateId();
  // Schema baru: ID | Referensi Agenda ID | Dari | Kepada | Tanggal | Status | Dibuat Pada |
  //              Nama Kegiatan | Waktu | Lokasi | Pakaian | CP Nama | CP No WA | Keterangan Selesai | URL Bukti | File ID Bukti
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[
      id,
      data.agendaId || '-',
      data.dari || 'Bupati',
      data.kepada,
      data.tanggal || fmtDateSheet(),
      data.status || 'Diproses',
      fmtDateSheet(),
      data.namaKegiatan || '',
      data.waktu || '',
      data.lokasi || '',
      data.pakaian || '',
      data.cpNama || '',
      data.cpNoWa ? "'" + data.cpNoWa : '',
      '', '', ''
    ]] }
  });
  return { success: true, message: 'Disposisi berhasil disimpan', id };
}

/**
 * Sinkronisasi disposisi saat agenda diedit:
 * - Jika status baru = Disposisi → buat/update disposisi
 * - Jika status lama = Disposisi & status baru ≠ Disposisi → hapus disposisi terkait
 */
async function syncAgendaDisposisi(sheets, drive, spreadsheetId, rootFolderId, payload) {
  const { agendaId, oldStatus, newStatus, agendaData } = payload;

  if (newStatus === 'Disposisi') {
    // Cek apakah sudah ada disposisi untuk agenda ini
    const dispRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A:Z` });
    const rows = dispRes.data.values || [];
    const headers = rows[0] || [];
    const refIdx = headers.indexOf('Referensi Agenda ID');
    const existingIdx = refIdx !== -1 ? rows.findIndex((r, i) => i > 0 && String(r[refIdx]) === String(agendaId)) : -1;

    if (existingIdx !== -1) {
      // Update disposisi yang sudah ada dengan data terbaru
      const oldRow = rows[existingIdx];
      const newRow = [...oldRow];
      // Selalu update semua field — pakai nilai baru jika ada, fallback ke lama
      if (agendaData.disposisiKepada) newRow[3] = agendaData.disposisiKepada;
      if (agendaData.tanggal) newRow[4] = agendaData.tanggal;
      if (agendaData.namaKegiatan) newRow[7] = agendaData.namaKegiatan;
      if (agendaData.waktu !== undefined) newRow[8] = agendaData.waktu;
      if (agendaData.lokasi !== undefined) newRow[9] = agendaData.lokasi;
      if (agendaData.pakaian !== undefined) newRow[10] = agendaData.pakaian;
      if (agendaData.cpNama !== undefined) newRow[11] = agendaData.cpNama;
      if (agendaData.cpNoWa !== undefined) newRow[12] = agendaData.cpNoWa ? (agendaData.cpNoWa.startsWith("'") ? agendaData.cpNoWa : "'" + agendaData.cpNoWa) : oldRow[12];
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A${existingIdx + 1}`,
        valueInputOption: 'USER_ENTERED', resource: { values: [newRow] }
      });
      return { success: true, message: 'Disposisi diperbarui', action: 'updated' };
    } else {
      // Buat disposisi baru
      const dispId = generateId();
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A1`, valueInputOption: 'USER_ENTERED',
        resource: { values: [[
          dispId, agendaId,
          agendaData.disposisiDari || 'Bupati',
          agendaData.disposisiKepada || '-',
          agendaData.tanggal || fmtDateSheet(),
          'Diproses', fmtDateSheet(),
          agendaData.namaKegiatan || '',
          agendaData.waktu || '',
          agendaData.lokasi || '',
          agendaData.pakaian || '',
          agendaData.cpNama || '',
          agendaData.cpNoWa ? "'" + agendaData.cpNoWa : '',
          '', '', ''
        ]] }
      });
      return { success: true, message: 'Disposisi baru dibuat', action: 'created' };
    }
  } else if (oldStatus === 'Disposisi' && newStatus !== 'Disposisi') {
    // Hapus semua disposisi yang mereferensikan agenda ini
    const dispRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A:Z` });
    const rows = dispRes.data.values || [];
    const headers = rows[0] || [];
    const refIdx = headers.indexOf('Referensi Agenda ID');
    if (refIdx === -1) return { success: true, message: 'Tidak ada disposisi untuk dihapus', action: 'none' };

    // Kumpulkan semua index yang perlu dihapus (dari bawah ke atas)
    const toDelete = [];
    rows.forEach((r, i) => { if (i > 0 && String(r[refIdx]) === String(agendaId)) toDelete.push(i); });

    if (!toDelete.length) return { success: true, message: 'Tidak ada disposisi terkait', action: 'none' };

    const ss = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = ss.data.sheets.find(s => s.properties.title === CONFIG.SHEETS.DISPOSISI);
    const sheetId = sheet.properties.sheetId;

    // Hapus dari bawah ke atas agar index tidak bergeser
    for (let i = toDelete.length - 1; i >= 0; i--) {
      const idx = toDelete[i];
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 } } }] }
      });
    }
    return { success: true, message: toDelete.length + ' disposisi dihapus', action: 'deleted', count: toDelete.length };
  }

  return { success: true, message: 'Tidak ada perubahan disposisi', action: 'none' };
}

/**
 * Sinkronisasi perubahan dari Disposisi kembali ke Agenda terkait.
 * Dipanggil saat user mengedit data kegiatan di menu Disposisi.
 */
async function syncDisposisiToAgenda(sheets, spreadsheetId, payload) {
  const { agendaId, data } = payload;
  if (!agendaId || agendaId === '-') return { success: true, message: 'Tidak ada agenda terkait.' };

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.AGENDA}!A:Z` });
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const index = rows.findIndex((r, i) => i > 0 && String(r[0]) === String(agendaId));
  if (index === -1) return { success: true, message: 'Agenda tidak ditemukan, skip.' };

  const oldRow = rows[index];
  const newRow = [...oldRow];

  // Agenda schema: ID(0) | Nama Kegiatan(1) | Tanggal(2) | Lokasi(3) | Waktu(4) |
  //   Pakaian(5) | Transit(6) | Keterangan(7) | Status Kehadiran(8) | Sambutan(9) |
  //   Sapaan(10) | Latitude(11) | Longitude(12) | CP Nama(13) | CP No WA(14) | ...
  if (data.namaKegiatan !== undefined && data.namaKegiatan) newRow[1] = data.namaKegiatan;
  if (data.tanggal      !== undefined && data.tanggal)      newRow[2] = data.tanggal;
  if (data.lokasi       !== undefined && data.lokasi)       newRow[3] = data.lokasi;
  if (data.waktu        !== undefined && data.waktu)        newRow[4] = data.waktu;
  if (data.pakaian      !== undefined && data.pakaian)      newRow[5] = data.pakaian;
  if (data.cpNama       !== undefined && data.cpNama)       newRow[13] = data.cpNama;
  if (data.cpNoWa       !== undefined && data.cpNoWa) {
    newRow[14] = data.cpNoWa.startsWith("'") ? data.cpNoWa : "'" + data.cpNoWa;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CONFIG.SHEETS.AGENDA}!A${index + 1}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [newRow] }
  });
  return { success: true, message: 'Agenda berhasil diperbarui dari disposisi.' };
}

/**
 * Tandai disposisi selesai dengan keterangan dan foto bukti opsional
 */
async function selesaiDisposisi(sheets, drive, spreadsheetId, rootFolderId, payload) {
  const { id, keterangan, fileData } = payload;

  let fileObj = { url: '', id: '' };
  if (fileData && fileData.content) {
    fileObj = await uploadToDrive(drive, rootFolderId, 'Disposisi/Bukti', fileData);
  }

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A:Z` });
  const rows = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Disposisi tidak ditemukan.' };

  const newRow = [...rows[index]];
  // Pastikan array cukup panjang
  while (newRow.length < 16) newRow.push('');
  newRow[5]  = 'Selesai';                    // Status
  newRow[13] = keterangan || '';             // Keterangan Selesai
  newRow[14] = fileObj.url || newRow[14];    // URL Bukti
  newRow[15] = fileObj.id  || newRow[15];    // File ID Bukti

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CONFIG.SHEETS.DISPOSISI}!A${index + 1}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [newRow] }
  });
  return { success: true, message: 'Disposisi ditandai selesai.', urlBukti: fileObj.url };
}

async function updateRowAndFile(sheets, drive, spreadsheetId, rootFolderId, sheetName, id, data, fileData) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:Z` });
  const rows = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Data tidak ditemukan' };

  const oldRow = rows[index];
  const headers = rows[0] || [];
  const fileIdIdx = headers.indexOf('File ID');
  const fileUrlIdx = headers.indexOf('URL');

  let fileObj = null;
  if (fileData && fileData.content) {
    // Tidak menghapus file lama di Drive — langsung upload yang baru
    fileObj = await uploadToDrive(drive, rootFolderId, data.kategori || sheetName, fileData);
  }

  let newRow = [...oldRow];
  if (fileObj && fileObj.url) {
    if (fileUrlIdx !== -1) newRow[fileUrlIdx] = fileObj.url;
    if (fileIdIdx !== -1) newRow[fileIdIdx] = fileObj.id;
    // Untuk Arsip: update Nama Drive File (index 5), bukan Nama File (index 1)
    if (sheetName === CONFIG.SHEETS.ARSIP) {
      const namaDriveIdx = headers.indexOf('Nama Drive File');
      if (namaDriveIdx !== -1) newRow[namaDriveIdx] = fileObj.name;
    } else {
      const fileNameIdx = headers.indexOf('Nama File');
      if (fileNameIdx !== -1) newRow[fileNameIdx] = fileObj.name;
    }
  } else if (data.deleteFile) {
    if (fileUrlIdx !== -1) newRow[fileUrlIdx] = '-';
    if (fileIdIdx !== -1) newRow[fileIdIdx] = '-';
    if (sheetName === CONFIG.SHEETS.ARSIP) {
      const namaDriveIdx = headers.indexOf('Nama Drive File');
      if (namaDriveIdx !== -1) newRow[namaDriveIdx] = '-';
    } else {
      const fileNameIdx = headers.indexOf('Nama File');
      if (fileNameIdx !== -1) newRow[fileNameIdx] = '-';
    }
  }

  // Update fields by sheet type
  if (sheetName === CONFIG.SHEETS.ARSIP) {
    newRow[1] = data.namaFile || oldRow[1];
    newRow[2] = data.kategori || oldRow[2];
    newRow[7] = data.deskripsi || oldRow[7];
    const tglIdx = headers.indexOf('Tanggal Arsip');
    if (tglIdx !== -1) newRow[tglIdx] = data.tglArsip || oldRow[tglIdx];
  } else if (sheetName === CONFIG.SHEETS.SURAT_MASUK) {
    newRow[1] = data.nomorSurat || oldRow[1]; newRow[2] = data.tanggal || oldRow[2];
    newRow[3] = data.pengirim || oldRow[3]; newRow[4] = data.perihal || oldRow[4];
    newRow[5] = data.kategori || oldRow[5]; newRow[9] = data.catatan || oldRow[9];
  } else if (sheetName === CONFIG.SHEETS.AGENDA) {
    newRow[1] = data.namaKegiatan || oldRow[1];
    newRow[2] = data.tanggal || oldRow[2]; newRow[3] = data.lokasi || oldRow[3];
    newRow[4] = data.waktu || oldRow[4]; newRow[5] = data.pakaian || oldRow[5];
    newRow[6] = data.transit || oldRow[6]; newRow[7] = data.keterangan || oldRow[7];
    newRow[8] = data.statusKehadiran || oldRow[8];
    newRow[9] = data.sambutan !== undefined ? data.sambutan : oldRow[9];
    newRow[10] = data.sapaan !== undefined ? data.sapaan : oldRow[10];
    newRow[13] = data.cpNama || oldRow[13];
    if (data.cpNoWa !== undefined) newRow[14] = data.cpNoWa ? (data.cpNoWa.startsWith("'") ? data.cpNoWa : "'" + data.cpNoWa) : '';
    if (data.latitude !== undefined) newRow[11] = data.latitude;
    if (data.longitude !== undefined) newRow[12] = data.longitude;

    // Handle file sambutan
    if (data.fileSambutan && data.fileSambutan.content) {
      const fSambutan = await uploadToDrive(drive, rootFolderId, 'Agenda/Sambutan', data.fileSambutan);
      newRow[18] = fSambutan.url || '';
      newRow[19] = fSambutan.id || '';
    } else if (data.deleteSambutan) {
      newRow[18] = ''; newRow[19] = '';
    }

    // Handle file sapaan
    if (data.fileSapaan && data.fileSapaan.content) {
      const fSapaan = await uploadToDrive(drive, rootFolderId, 'Agenda/Sapaan', data.fileSapaan);
      newRow[20] = fSapaan.url || '';
      newRow[21] = fSapaan.id || '';
    } else if (data.deleteSapaan) {
      newRow[20] = ''; newRow[21] = '';
    }
  } else if (sheetName === CONFIG.SHEETS.DISPOSISI) {
    newRow[1] = data.agendaId || oldRow[1]; newRow[2] = data.dari || oldRow[2];
    newRow[3] = data.kepada || oldRow[3];
    newRow[4] = data.tanggal || oldRow[4]; newRow[5] = data.status || oldRow[5];
    if (data.namaKegiatan !== undefined) newRow[7]  = data.namaKegiatan;
    if (data.waktu        !== undefined) newRow[8]  = data.waktu;
    if (data.lokasi       !== undefined) newRow[9] = data.lokasi;
    if (data.pakaian      !== undefined) newRow[10] = data.pakaian;
    if (data.cpNama       !== undefined) newRow[11] = data.cpNama;
    if (data.cpNoWa       !== undefined) newRow[12] = data.cpNoWa ? (data.cpNoWa.startsWith("'") ? data.cpNoWa : "'" + data.cpNoWa) : '';
  }

  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${sheetName}!A${index + 1}`, valueInputOption: 'USER_ENTERED', resource: { values: [newRow] } });
  return { success: true, message: 'Data berhasil diperbarui', id };
}

async function getUsers(sheets, spreadsheetId) {
  const res = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  if (!res.success) return res;
  return { success: true, data: res.data.map(u => ({ id: u.ID, username: u.Username, nama: u.Nama, role: u.Role, noWa: u['No WA'] || '', created: u['Dibuat Pada'] || u.CreatedAt || '' })) };
}

async function addUser(sheets, spreadsheetId, data) {
  const existing = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  if (existing.data.some(u => u.Username === data.username)) return { success: false, message: 'Username sudah digunakan.' };
  const id = generateId();
  const formattedWa = data.noWa ? "'" + data.noWa : '';
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [[id, data.username, hashPassword(data.password), data.nama, data.role || 'ADMIN', formattedWa, fmtDateSheet()]] } });
  return { success: true, message: 'Pengguna berhasil ditambahkan.' };
}

async function updateUserWA(sheets, spreadsheetId, id, noWa) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!A:Z` });
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const noWaIdx = headers.indexOf('No WA');
  if (noWaIdx === -1) return { success: false, message: 'Kolom No WA belum ada. Jalankan Setup Database terlebih dahulu.' };
  const index = rows.findIndex((r, i) => i > 0 && String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'User tidak ditemukan.' };
  const col = String.fromCharCode(65 + noWaIdx);
  const formattedWa = noWa ? "'" + noWa : '';
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!${col}${index + 1}`, valueInputOption: 'USER_ENTERED', resource: { values: [[formattedWa]] } });
  return { success: true, message: 'No WA berhasil diperbarui.' };
}

async function changePassword(sheets, spreadsheetId, username, oldPassword, newPassword) {
  const res = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  const index = res.data.findIndex(u => u.Username === username && u.Password === hashPassword(oldPassword));
  if (index === -1) return { success: false, message: 'Password lama salah.' };
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!C${index + 2}`, valueInputOption: 'USER_ENTERED', resource: { values: [[hashPassword(newPassword)]] } });
  return { success: true, message: 'Password berhasil diubah.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUDAN
// ─────────────────────────────────────────────────────────────────────────────
async function saveAjudan(sheets, spreadsheetId, data) {
  if (!data.nama) return { success: false, message: 'Nama ajudan wajib diisi.' };
  const id = generateId();
  const noWa = data.noWa ? "'" + String(data.noWa).replace(/^'/, '') : '';
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.AJUDAN}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, data.nama, noWa, fmtDateSheet()]] }
  });
  return { success: true, message: 'Ajudan berhasil ditambahkan.', id };
}

async function updateAjudan(sheets, spreadsheetId, id, data) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.AJUDAN}!A:D` });
  const rows = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Ajudan tidak ditemukan.' };
  const oldRow = rows[index];
  const newRow = [...oldRow];
  if (data.nama  !== undefined) newRow[1] = data.nama;
  if (data.noWa  !== undefined) newRow[2] = data.noWa ? "'" + String(data.noWa).replace(/^'/, '') : '';
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${CONFIG.SHEETS.AJUDAN}!A${index + 1}`,
    valueInputOption: 'USER_ENTERED', resource: { values: [newRow] }
  });
  return { success: true, message: 'Ajudan berhasil diperbarui.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// PEJABAT DISPOSISI
// ─────────────────────────────────────────────────────────────────────────────
async function savePejabatDisposisi(sheets, spreadsheetId, data) {
  if (!data.jabatan) return { success: false, message: 'Jabatan wajib diisi.' };
  const id = generateId();
  const noWa = data.noWa ? "'" + String(data.noWa).replace(/^'/, '') : '';
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.PEJABAT_DISPOSISI}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, data.jabatan, data.nama || '', noWa, fmtDateSheet()]] }
  });
  return { success: true, message: 'Pejabat berhasil ditambahkan.', id };
}

async function updatePejabatDisposisi(sheets, spreadsheetId, id, data) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.PEJABAT_DISPOSISI}!A:E` });
  const rows = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Pejabat tidak ditemukan.' };
  const oldRow = rows[index];
  const newRow = [...oldRow];
  if (data.jabatan !== undefined) newRow[1] = data.jabatan;
  if (data.nama    !== undefined) newRow[2] = data.nama || '';
  if (data.noWa    !== undefined) newRow[3] = data.noWa ? "'" + String(data.noWa).replace(/^'/, '') : '';
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${CONFIG.SHEETS.PEJABAT_DISPOSISI}!A${index + 1}`,
    valueInputOption: 'USER_ENTERED', resource: { values: [newRow] }
  });
  return { success: true, message: 'Pejabat berhasil diperbarui.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE SURAT
// ─────────────────────────────────────────────────────────────────────────────
async function saveTemplate(sheets, drive, spreadsheetId, rootFolderId, data, fileData) {
  if (!fileData || !fileData.content) return { success: false, message: 'File template wajib diunggah.' };

  // Upload .docx ke Google Drive
  const file = await uploadToDrive(drive, rootFolderId, 'Template Surat', fileData);

  // Parse variabel {{...}} dari nama file (user akan kirim dari frontend, atau kita simpan raw)
  const variables = data.variables || [];

  const id = generateId();
  // Schema: ID | Nama Template | Deskripsi | Variables (JSON) | URL | Nama File | File ID | Dibuat Pada
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${CONFIG.SHEETS.TEMPLATE_SURAT}!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[
        id,
        data.namaTemplate || fileData.name,
        data.deskripsi || '-',
        JSON.stringify(variables),
        file.url,
        fileData.name,
        file.id || '-',
        fmtDateSheet()
      ]]
    }
  });
  return { success: true, message: 'Template berhasil disimpan.', id, url: file.url, fileId: file.id };
}

async function deleteTemplate(sheets, drive, spreadsheetId, id) {
  // Ambil data dulu untuk dapat fileId
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.TEMPLATE_SURAT}!A:G` });
  const rows = res.data.values || [];
  const row = rows.find(r => String(r[0]) === String(id));
  if (row && row[6] && row[6] !== '-') {
    try { await drive.files.delete({ fileId: row[6] }); } catch (e) { /* ignore if already gone */ }
  }
  return deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.TEMPLATE_SURAT, id);
}

async function parseTemplateVariables(sheets, spreadsheetId, templateId) {
  // Ambil metadata template dari sheet untuk mendapatkan variables yang tersimpan
  const res = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.TEMPLATE_SURAT);
  if (!res.success) return res;
  const tpl = res.data.find(d => String(d['ID']) === String(templateId));
  if (!tpl) return { success: false, message: 'Template tidak ditemukan.' };
  let variables = [];
  try { variables = JSON.parse(tpl['Variables'] || '[]'); } catch (e) { variables = []; }
  return { success: true, variables, template: tpl };
}

async function updateTemplateVars(sheets, spreadsheetId, id, variables) {
  // Update kolom Variables (index 3) pada baris yang sesuai
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.TEMPLATE_SURAT}!A:Z` });
  const rows = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Template tidak ditemukan.' };
  // Kolom D (index 3) = Variables
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CONFIG.SHEETS.TEMPLATE_SURAT}!D${index + 1}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[JSON.stringify(variables || [])]] }
  });
  return { success: true, message: 'Variabel template berhasil diperbarui.', count: (variables || []).length };
}

// ─────────────────────────────────────────────────────────────────────────────
// PETA DRAWINGS
// ─────────────────────────────────────────────────────────────────────────────
async function saveMapDrawings(sheets, spreadsheetId, drawings) {
  if (!drawings || !drawings.length) return { success: false, message: 'Tidak ada gambar.' };
  // Hapus semua data lama dulu, lalu tulis ulang
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.PETA_DRAWINGS}!A:A` });
  const rows = res.data.values || [];
  if (rows.length > 1) {
    const ss = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = ss.data.sheets.find(s => s.properties.title === CONFIG.SHEETS.PETA_DRAWINGS);
    if (sheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: 1, endIndex: rows.length } } }] }
      });
    }
  }
  const rowsToWrite = drawings.map(d => [
    generateId(),
    d.tipe || '',
    d.warna || '#1e6fd9',
    d.nama || '',
    d.ket || '',
    d.measurement || '',
    typeof d.geojson === 'string' ? d.geojson : JSON.stringify(d.geojson),
    fmtDateSheet()
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.PETA_DRAWINGS}!A1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: rowsToWrite }
  });
  return { success: true, message: drawings.length + ' gambar disimpan.', count: drawings.length };
}

async function getMapDrawings(sheets, spreadsheetId) {
  const res = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.PETA_DRAWINGS);
  if (!res.success) return res;
  return {
    success: true,
    data: res.data.map(r => ({
      id: r.ID,
      tipe: r.Tipe || '',
      warna: r.Warna || '#1e6fd9',
      nama: r.Nama || '',
      ket: r.Keterangan || '',
      measurement: r.Measurement || '',
      geojson: r.GeoJSON || ''
    }))
  };
}

async function clearMapDrawings(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.PETA_DRAWINGS}!A:A` });
  const rows = res.data.values || [];
  if (rows.length <= 1) return { success: true, message: 'Tidak ada data.' };
  const ss = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = ss.data.sheets.find(s => s.properties.title === CONFIG.SHEETS.PETA_DRAWINGS);
  if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: 1, endIndex: rows.length } } }] }
  });
  return { success: true, message: 'Semua gambar dihapus.' };
}

async function setupDb(sheets, spreadsheetId) {
  const SCHEMA = [
    {
      name: CONFIG.SHEETS.USERS,
      headers: ['ID', 'Username', 'Password', 'Nama', 'Role', 'No WA', 'Dibuat Pada']
    },
    { name: CONFIG.SHEETS.SURAT_MASUK, headers: ['ID', 'Nomor Surat', 'Tanggal', 'Pengirim', 'Perihal', 'Kategori', 'URL', 'Nama File', 'File ID', 'Catatan', 'Dibuat Pada'] },
    { name: CONFIG.SHEETS.AGENDA, headers: ['ID', 'Nama Kegiatan', 'Tanggal', 'Lokasi', 'Waktu', 'Pakaian', 'Transit', 'Keterangan', 'Status Kehadiran', 'Sambutan', 'Sapaan', 'Latitude', 'Longitude', 'CP Nama', 'CP No WA', 'URL', 'Nama File', 'File ID', 'URL Sambutan', 'File ID Sambutan', 'URL Sapaan', 'File ID Sapaan', 'Dibuat Pada'] },
    { name: CONFIG.SHEETS.DISPOSISI, headers: ['ID', 'Referensi Agenda ID', 'Dari', 'Kepada', 'Tanggal', 'Status', 'Dibuat Pada', 'Nama Kegiatan', 'Waktu', 'Lokasi', 'Pakaian', 'CP Nama', 'CP No WA', 'Keterangan Selesai', 'URL Bukti', 'File ID Bukti'] },
    { name: CONFIG.SHEETS.ARSIP, headers: ['ID', 'Nama File', 'Kategori', 'Folder', 'URL', 'Nama Drive File', 'File ID', 'Deskripsi', 'Ukuran', 'Dibuat Pada', 'Tanggal Arsip'] },
    { name: CONFIG.SHEETS.TEMPLATE_SURAT, headers: ['ID', 'Nama Template', 'Deskripsi', 'Variables', 'URL', 'Nama File', 'File ID', 'Dibuat Pada'] },
    { name: CONFIG.SHEETS.PETA_DRAWINGS, headers: ['ID', 'Tipe', 'Warna', 'Nama', 'Keterangan', 'Measurement', 'GeoJSON', 'Dibuat Pada'] },
    { name: CONFIG.SHEETS.AJUDAN, headers: ['ID', 'Nama', 'No WA', 'Dibuat Pada'] },
    { name: CONFIG.SHEETS.PEJABAT_DISPOSISI, headers: ['ID', 'Jabatan', 'Nama', 'No WA', 'Dibuat Pada'] }
  ];

  function buildHeaderFormat(sheetId, numCols) {
    return [
      { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols }, cell: { userEnteredFormat: { backgroundColor: { red: 0.1, green: 0.435, blue: 0.749 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 }, horizontalAlignment: 'CENTER', wrapStrategy: 'CLIP' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)' } },
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } }
    ];
  }

  const ssInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const existingMetas = ssInfo.data.sheets;
  const results = { created: [], migrated: [], unchanged: [] };
  const fmtRequests = [];

  for (const schema of SCHEMA) {
    const existing = existingMetas.find(s => s.properties.title === schema.name);
    if (!existing) {
      const addRes = await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: [{ addSheet: { properties: { title: schema.name } } }] } });
      const newShId = addRes.data.replies[0].addSheet.properties.sheetId;
      await sheets.spreadsheets.values.update({ spreadsheetId, range: `${schema.name}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [schema.headers] } });
      fmtRequests.push(...buildHeaderFormat(newShId, schema.headers.length));
      results.created.push(schema.name);
    } else {
      const sheetId = existing.properties.sheetId;
      const readRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${schema.name}!A:Z` });
      const eRows = readRes.data.values || [];
      const eHdrs = eRows[0] || [];
      const dataRows = eRows.slice(1);
      const match = eHdrs.length === schema.headers.length && schema.headers.every((h, i) => h === eHdrs[i]);
      if (!match) {
        const migratedRows = dataRows.map(row => schema.headers.map(col => { const idx = eHdrs.indexOf(col); return idx !== -1 ? (row[idx] || '') : ''; }));
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${schema.name}!A:Z` });
        await sheets.spreadsheets.values.update({ spreadsheetId, range: `${schema.name}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [schema.headers, ...migratedRows] } });
        results.migrated.push(schema.name);
      } else {
        results.unchanged.push(schema.name);
      }
      fmtRequests.push(...buildHeaderFormat(sheetId, schema.headers.length));
    }
  }

  if (fmtRequests.length > 0) await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: fmtRequests } });

  const parts = [];
  if (results.created.length) parts.push(`✅ Dibuat: ${results.created.join(', ')}`);
  if (results.migrated.length) parts.push(`🔄 Dimigrasi: ${results.migrated.join(', ')}`);
  if (results.unchanged.length) parts.push(`✔️ Sesuai: ${results.unchanged.join(', ')}`);
  return { success: true, message: parts.join(' | ') || 'Database sudah siap.' };
}
