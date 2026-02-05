import { REPORT_SCHEMAS, ReportSchema } from './schemas';

export interface NormalizedRow {
    date: string; // ISO Date String
    produced: number;
    rejected: number;
    defects: Record<string, number>;
    stage: string;
    isProductionMaster: boolean;
    validationErrors: string[];
}

export const DataNormalizer = {
    normalizeSheet: (rawRows: any[][]): NormalizedRow[] => {
        if (!rawRows || rawRows.length === 0) return [];

        // 1. Detect Schema
        const schema = detectSchema(rawRows);
        if (!schema) {
            console.warn('[Normalizer] No matching schema found for sheet. Falling back to generic parsing if possible?');
            // TODO: Fallback or return empty
            return [];
        }
        console.log(`[Normalizer] Detected Schema: ${schema.name}`);

        // 2. Find Header Row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, rawRows.length); i++) {
            const rowStr = JSON.stringify(rawRows[i]);
            if (schema.headerPattern.test(rowStr)) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.warn('[Normalizer] Could not find header row');
            return [];
        }

        const headers = rawRows[headerRowIndex].map(c => String(c).trim());

        // 3. Map Columns
        const dateColIdx = headers.findIndex((h: string) => /DATE|S\.NO/i.test(h));
        const producedColIndicies = findColumnIndices(headers, schema.producedColumnPatterns || []);

        // 4. Process Rows
        const normalized: NormalizedRow[] = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            // Date Parsing
            const dateVal = row[dateColIdx];
            const dateStr = parseDate(dateVal);
            if (!dateStr) continue; // Skip invalid dates (TOTAL, SUNDAY, etc)

            // Counts
            let produced = 0;
            producedColIndicies.forEach(idx => {
                produced += parseNum(row[idx]);
            });

            // Defects extraction using Schema Logic
            const defects = schema.extractDefects(headers, row);

            // Calculate Total Rejected from explicit defects
            let totalDefects = 0;
            Object.values(defects).forEach(v => totalDefects += v);

            // Validation Logic
            const errors: string[] = [];

            // Integrity Check: Rejected <= Produced
            // Only applicable if produced > 0 (sometimes produced is missing in rejection reports)
            if (produced > 0 && totalDefects > produced) {
                errors.push(`Integrity Error: Rejected (${totalDefects}) > Produced (${produced})`);
            }

            // Zero-Sum Check: If "Total Rej" column exists, match it?
            // (We currently derive rejected from defects, so sum is always consistent by definition)
            // But if we parsed 'Total Rej' separately, we would compare. For now, derived is safest.

            normalized.push({
                date: dateStr,
                produced,
                rejected: totalDefects,
                defects,
                stage: schema.stage || 'unknown',
                isProductionMaster: !!schema.isProductionMaster,
                validationErrors: errors
            });
        }

        return normalized;
    }
};

function detectSchema(rows: any[][]): ReportSchema | undefined {
    // Check signature in first 10 rows
    const sample = rows.slice(0, 10).map(r => JSON.stringify(r)).join(' ');
    // Handle rows having nulls
    return REPORT_SCHEMAS.find(s => s.signaturePatterns.every(p => p.test(sample)));
}

function findColumnIndices(headers: string[], patterns: RegExp[]): number[] {
    const indices: number[] = [];
    headers.forEach((h, i) => {
        const header = String(h || '');
        if (patterns.some(p => p.test(header))) indices.push(i);
    });
    return indices;
}

function parseNum(val: any): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
}

function parseDate(val: any): string | null {
    if (!val) return null;
    if (typeof val === 'number') {
        if (val < 20000 || val > 60000) return null; // Safety range for excel dates
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (str.toUpperCase().includes('TOTAL') || str.toUpperCase().includes('WEEK')) return null;

    // Try parse string
    const d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
        return d.toISOString().split('T')[0];
    }
    return null;
}
