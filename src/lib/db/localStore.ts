
import fs from 'fs';
import path from 'path';
import { DataAggregator } from './aggregator';
import { NormalizedRow } from '../ingestion/normalizer';

const DB_PATH = path.join(process.cwd(), 'src', 'lib', 'db', 'local_db.json');

export interface LocalDB {
    overview: {
        produced: number;
        rejected: number;
        days: Record<string, { produced: number; rejected: number; defects: Record<string, number> }>;
    };
    defects: Record<string, { count: number; category: string; severity: string }>;
    uploads: Array<{
        id: string;
        filename: string;
        date: string;
        records: number;
    }>;
}

// Initialize empty DB if not exists
function initDB(): LocalDB {
    return {
        overview: { produced: 0, rejected: 0, days: {} },
        defects: {},
        uploads: [],
    };
}

export const LocalStore = {
    read: (): LocalDB => {
        try {
            if (!fs.existsSync(DB_PATH)) return initDB();
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch {
            return initDB();
        }
    },

    write: (data: LocalDB) => {
        // Ensure dir exists
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    },

    // Process and save parsed Excel data
    saveUpload: (filename: string, dataRows: NormalizedRow[]) => {
        let db = LocalStore.read();
        db = DataAggregator.processUpload(db, filename, dataRows);
        LocalStore.write(db);
    },

    reset: () => {
        LocalStore.write(initDB());
    }
};
