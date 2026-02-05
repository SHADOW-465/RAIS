import { LocalDB } from './localStore';
import { NormalizedRow } from '../ingestion/normalizer';

export const DataAggregator = {
    processUpload: (db: LocalDB, filename: string, dataRows: NormalizedRow[]): LocalDB => {
        // Create new upload record
        db.uploads.push({
            id: `local-${Date.now()}`,
            filename,
            date: new Date().toISOString(),
            records: dataRows.length
        });

        if (dataRows.length > 0) {
            // console.log('[Aggregator] Processing upload:', filename, 'Rows:', dataRows.length);
        }

        dataRows.forEach(row => {
            const { date, produced, rejected, defects, isProductionMaster } = row;

            // Initialize day entry
            if (!db.overview.days[date]) {
                db.overview.days[date] = { produced: 0, rejected: 0, defects: {} };
            }

            // INVARIANT: Only add to Produced stats if it is a Production Master Record
            if (isProductionMaster) {
                db.overview.produced += produced;
                db.overview.days[date].produced += produced;
            }

            // Rejections are always added (from any report)
            db.overview.rejected += rejected;
            db.overview.days[date].rejected += rejected;

            // Handle defects
            Object.entries(defects).forEach(([code, count]) => {
                if (count <= 0) return;

                db.overview.days[date].defects[code] = (db.overview.days[date].defects[code] || 0) + count;

                if (!db.defects[code]) {
                    db.defects[code] = { count: 0, category: 'visual', severity: 'minor' };
                }
                db.defects[code].count += count;
            });
        });

        return db;
    },

    merge: (target: LocalDB, source: LocalDB): LocalDB => {
        // Merge Overview
        target.overview.produced += source.overview.produced;
        target.overview.rejected += source.overview.rejected;

        // Merge Days
        Object.keys(source.overview.days).forEach(date => {
            if (!target.overview.days[date]) {
                target.overview.days[date] = { produced: 0, rejected: 0, defects: {} };
            }
            target.overview.days[date].produced += source.overview.days[date].produced;
            target.overview.days[date].rejected += source.overview.days[date].rejected;

            // Merge Daily Defects
            Object.keys(source.overview.days[date].defects).forEach(code => {
                target.overview.days[date].defects[code] = (target.overview.days[date].defects[code] || 0) + source.overview.days[date].defects[code];
            });
        });

        // Merge Global Defects
        Object.keys(source.defects).forEach(code => {
            if (!target.defects[code]) {
                target.defects[code] = { count: 0, category: source.defects[code].category, severity: source.defects[code].severity };
            }
            target.defects[code].count += source.defects[code].count;
        });

        // Merge Uploads History
        target.uploads = [...target.uploads, ...source.uploads];

        return target;
    }
};
