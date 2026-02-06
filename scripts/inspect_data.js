const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
const FILE_DIR = path.join(process.cwd(), 'REJECTION DATA');

async function run() {
    const sessionId = `debug_${Date.now()}`;
    console.log('[INIT] Session:', sessionId);

    // 1. Test Visual Report (Should yield 0 Production in Global Stats)
    await testFile(sessionId, 'VISUAL INSPECTION REPORT 2025.xlsx');

    // 2. Test Assembly Report (Should yield 0 Production in Global Stats)
    await testFile(sessionId, 'ASSEMBLY REJECTION REPORT.xlsx');

    // 3. Test Production Master (Should yield Positive Production)
    await testFile(sessionId, 'YEARLY PRODUCTION COMMULATIVE 2025-26.xlsx');

    // 3. Test Balloon Report
    // await testFile(sessionId, 'BALLOON & VALVE INTEGRITY INSPECTION REPORT FILE 2025.xlsx');
}

async function testFile(sessionId, filename) {
    console.log(`\n\n=== TESTING FILE: ${filename} ===`);

    // Upload
    const filePath = path.join(FILE_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.error('[SKIP] File not found:', filename);
        return;
    }

    const formData = new FormData();
    const blob = new Blob([fs.readFileSync(filePath)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, filename);

    const upRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'x-rais-session-id': sessionId },
        body: formData
    });

    if (!upRes.ok) {
        console.error('[UPLOAD FAIL]', await upRes.text());
        return;
    }
    console.log('[UPLOAD] Success');

    // Fetch Overview
    const ovRes = await fetch(`${API_URL}/analytics/overview`, {
        headers: { 'x-rais-session-id': sessionId }
    });
    const overview = await ovRes.json();
    console.log('[OVERVIEW]', JSON.stringify(overview.data, null, 2));

    // Fetch Pareto (Defects)
    const parRes = await fetch(`${API_URL}/analytics/pareto`, {
        headers: { 'x-rais-session-id': sessionId }
    });
    const pareto = await parRes.json();
    console.log('[DEFECTS]', JSON.stringify(pareto.data, null, 2));

    // Fetch Trends
    const trRes = await fetch(`${API_URL}/analytics/trends?period=30d`, {
        headers: { 'x-rais-session-id': sessionId }
    });
    const trends = await trRes.json();
    console.log('[TRENDS]', JSON.stringify(trends.data?.summary, null, 2));
    if (trends.data?.timeline?.length > 0) {
        console.log('[TRENDS] Timeline First Point:', trends.data.timeline[0]);
        console.log('[TRENDS] Timeline Last Point:', trends.data.timeline[trends.data.timeline.length - 1]);
    } else {
        console.error('[TRENDS] NO TIMELINE DATA!');
    }

    // Reset Session for next file
    await fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'x-rais-session-id': sessionId }
    });
    console.log('[RESET] Session cleared');
}

run();
