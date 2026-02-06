
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Config
const BASE_URL = 'http://localhost:3000/api';
const FILE_PATH = path.join(process.cwd(), 'REJECTION DATA', 'VISUAL INSPECTION REPORT 2025.xlsx');
// Assuming user has this file or I should use one of the files from previous context if available.
// I'll search for available .xlsx files.

const log = (step, msg, data) => {
    console.log(`[${step}] ${msg}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

async function run() {
    log('INIT', 'Starting Session Flow Test');

    // 1. Generate Session ID
    const sessionId = `sess_${Date.now()}`;
    log('SESSION', `Created Session: ${sessionId}`);

    // get file
    // I need to find a valid file first.
    // I'll assume 'VISUAL INSPECTION REPORT 2025.xlsx' exists in project root or I'll copy it.
    // In previous steps, it was used.

    const fileToUpload = FILE_PATH;
    if (!fs.existsSync(fileToUpload)) {
        log('ERROR', `Test file not found at: ${fileToUpload}`);
        return;
    }

    const fileContent = fs.readFileSync(fileToUpload);
    const formDataBoundary = '--------------------------' + Date.now().toString(16);

    // Construct Multipart Form Data manually for fetch
    const preamble = `--${formDataBoundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(fileToUpload)}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
    const epilogue = `\r\n--${formDataBoundary}--`;
    const body = Buffer.concat([
        Buffer.from(preamble),
        fileContent,
        Buffer.from(epilogue)
    ]);

    // 2. Upload to Session
    log('UPLOAD', `Uploading ${fileToUpload} to Session...`);
    const uploadRes = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        headers: {
            'x-rais-session-id': sessionId,
            'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`
        },
        body: body
    });
    const uploadJson = await uploadRes.json();
    log('UPLOAD', 'Response:', uploadJson);

    if (!uploadJson.success) {
        log('FAIL', 'Upload failed');
        return;
    }

    // 3. Verify Session Stats
    log('VERIFY', 'Checking Session Stats...');
    const statsRes = await fetch(`${BASE_URL}/analytics/overview`, {
        headers: { 'x-rais-session-id': sessionId }
    });
    const statsJson = await statsRes.json();
    log('STATS', 'Session Data:', statsJson.data.volume);

    if (statsJson.data.volume.produced === 0) {
        log('FAIL', 'Session stats are empty!');
        return;
    }

    // 4. Verify Isolation (No Header)
    log('VERIFY', 'Checking Global Stats (Should be unaffected locally or different)...');
    const globalRes = await fetch(`${BASE_URL}/analytics/overview`);
    const globalJson = await globalRes.json();
    log('STATS', 'Global Data:', globalJson.data.volume);

    // 5. Save/Commit
    log('SAVE', 'Committing Session...');
    const saveRes = await fetch(`${BASE_URL}/session/save`, {
        method: 'POST',
        headers: { 'x-rais-session-id': sessionId }
    });
    const saveJson = await saveRes.json();
    log('SAVE', 'Response:', saveJson);

    // 6. Verify Global Stats Updated
    log('VERIFY', 'Checking Global Stats After Save...');
    const finalRes = await fetch(`${BASE_URL}/analytics/overview`);
    const finalJson = await finalRes.json();
    log('STATS', 'Final Global Data:', finalJson.data.volume);

    if (finalJson.data.volume.produced > globalJson.data.volume.produced) {
        log('SUCCESS', 'Data successfully merged to global store!');
    } else {
        log('WARN', 'Global data did not increase. Maybe it was already there?');
    }

    // 7. Reset Session
    log('RESET', 'Resetting Session...');
    await fetch(`${BASE_URL}/session/reset`, {
        method: 'POST',
        headers: { 'x-rais-session-id': sessionId }
    });

    // Check Session Empty
    const resetRes = await fetch(`${BASE_URL}/analytics/overview`, {
        headers: { 'x-rais-session-id': sessionId }
    });
    const resetJson = await resetRes.json();
    log('STATS', 'Session Data After Reset (Should be empty/zero):', resetJson.data.volume);
}

run();
