const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const DATA_DIR = 'C:\\Users\\acer\\Documents\\projects\\RAIS\\REJECTION DATA';
const FILES = ['ASSEMBLY REJECTION REPORT.xlsx', 'VISUAL INSPECTION REPORT 2025.xlsx'];

async function log(step, message, data = null) {
    console.log(`\n[${step}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2).slice(0, 1000));
}

async function testUpload(filename) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return;
    const blob = new Blob([fs.readFileSync(filePath)], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, filename);
    try {
        const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
        const json = await res.json();
        log('UPLOAD', `${filename}: ${res.status}`, json);
    } catch (err) { log('ERROR', err.message); }
}

async function checkLocalDB() {
    const dbPath = 'C:\\Users\\acer\\Documents\\projects\\RAIS\\src\\lib\\db\\local_db.json';
    if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        log('DB CHECK', 'Content', {
            produced: data.overview.produced,
            rejected: data.overview.rejected,
            defectCounts: data.defects
        });
    }
}

async function run() {
    for (const f of FILES) { await testUpload(f); await new Promise(r => setTimeout(r, 1000)); }
    await checkLocalDB();
}
run();
