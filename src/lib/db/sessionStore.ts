
import fs from 'fs';
import path from 'path';
import { LocalDB } from './localStore';
import { DataAggregator } from './aggregator';
import { NormalizedRow } from '../ingestion/normalizer';

const SESSIONS_DIR = path.join(process.cwd(), 'src', 'lib', 'db', 'sessions');

// Initialize empty DB
function initDB(): LocalDB {
    return {
        overview: { produced: 0, rejected: 0, days: {} },
        defects: {},
        uploads: [],
    };
}

export const SessionStore = {
    // Get file path for session
    getPath: (sessionId: string) => path.join(SESSIONS_DIR, `${sessionId}.json`),

    // Read session data
    read: (sessionId: string): LocalDB => {
        try {
            const p = SessionStore.getPath(sessionId);
            if (!fs.existsSync(p)) return initDB();
            const data = fs.readFileSync(p, 'utf-8');
            return JSON.parse(data);
        } catch {
            return initDB();
        }
    },

    // Write session data
    write: (sessionId: string, data: LocalDB) => {
        if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        const p = SessionStore.getPath(sessionId);
        fs.writeFileSync(p, JSON.stringify(data, null, 2));
    },

    // Save upload to session
    saveUpload: (sessionId: string, filename: string, dataRows: NormalizedRow[]) => {
        let db = SessionStore.read(sessionId);
        db = DataAggregator.processUpload(db, filename, dataRows);
        SessionStore.write(sessionId, db);
    },

    // Reset/Delete session
    reset: (sessionId: string) => {
        const p = SessionStore.getPath(sessionId);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    },

    // Check if session exists/has data
    exists: (sessionId: string): boolean => {
        const p = SessionStore.getPath(sessionId);
        return fs.existsSync(p);
    }
};
