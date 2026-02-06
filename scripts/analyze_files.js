const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DIR = path.join(process.cwd(), 'REJECTION DATA');
let outputBuffer = '';

const log = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    console.log(msg);
    outputBuffer += msg + '\n';
};

try {
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.xlsx'));

    files.forEach(file => {
        log(`\n==================================================`);
        log(`FILE: ${file}`);
        log(`==================================================`);

        try {
            const buf = fs.readFileSync(path.join(DIR, file));
            const wb = XLSX.read(buf, { type: 'buffer' });

            wb.SheetNames.forEach(name => {
                const ws = wb.Sheets[name];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

                if (data.length === 0) {
                    log(`Sheet: "${name}" [EMPTY]`);
                    return;
                }

                log(`Sheet: "${name}" [Rows: ${data.length}]`);

                // Print first 20 non-empty rows
                let printed = 0;
                for (let i = 0; i < Math.min(50, data.length); i++) {
                    const row = data[i];
                    const hasContent = row.some(c => c !== null && c !== undefined && String(c).trim() !== '');
                    if (hasContent) {
                        log(`[R${i}]`, JSON.stringify(row));
                        printed++;
                    }
                }
                if (data.length > 50) log(`... (${data.length - 50} more rows)`);
            });
        } catch (err) {
            log(`ERROR processing ${file}: ${err.message}`);
        }
    });

    fs.writeFileSync('analysis_output_clean.txt', outputBuffer, 'utf8');
    log('Analysis complete. Written to analysis_output_clean.txt');

} catch (e) {
    log('Error:', e);
    fs.writeFileSync('analysis_output_clean.txt', outputBuffer, 'utf8');
}
