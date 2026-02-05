const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'C:\\Users\\acer\\Documents\\projects\\RAIS\\REJECTION DATA';
const FILE = 'VISUAL INSPECTION REPORT 2025.xlsx';
const filePath = path.join(DATA_DIR, FILE);

if (fs.existsSync(filePath)) {
    console.log(`\n=== DUMPING ROWS: ${FILE} ===`);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Raw arrays

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        console.log(`Row ${i} (Len ${rows[i].length}):`, JSON.stringify(rows[i]));
    }
} else {
    console.log('File not found');
}
