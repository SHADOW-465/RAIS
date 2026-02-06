export interface ReportSchema {
    id: string;
    name: string;
    signaturePatterns: RegExp[];
    headerPattern: RegExp;
    producedColumnPatterns?: RegExp[];
    /**
     * Custom logic to extract defects from a row given the headers.
     * This allows handling contextual columns (e.g. "REJ QTY" meaning distinct things based on previous columns).
     */
    extractDefects: (headers: string[], row: any[]) => Record<string, number>;
    stage: 'visual' | 'assembly' | 'balloon' | 'production_master' | 'shopfloor' | 'unknown';
    isProductionMaster?: boolean;
}

export const REPORT_SCHEMAS: ReportSchema[] = [
    {
        id: 'shopfloor',
        name: 'Shopfloor Rejection Report',
        signaturePatterns: [/MONTHLY.*SHOP.*FLOOR/i],
        stage: 'shopfloor',
        headerPattern: /(DATE|MONTH).*(TROLLEYS|COAG)/i,
        producedColumnPatterns: [/No of TROLLEYS/i],
        extractDefects: (headers: string[], row: any[]) => {
            const defects: Record<string, number> = {};
             headers.forEach((h, idx) => {
                const header = (h || '').trim();
                // Skip Date, Trolleys, and Total columns
                if (/DATE|TROLLEYS|TOTAL/i.test(header) || !header) return;

                const val = parseNum(row[idx]);
                if (val > 0) {
                     defects[header] = (defects[header] || 0) + val;
                }
            });
            return defects;
        }
    },
    {
        id: 'production_master',
        name: 'Production Master Record',
        signaturePatterns: [/YEARLY PRODUCTION/i],
        headerPattern: /(DATE|MONTH).*(QTY|PROD|REJ|DISPATCH)/i,
        producedColumnPatterns: [/TOTAL.*PROD/i, /QTY.*PROD/i],
        stage: 'production_master',
        isProductionMaster: true,
        extractDefects: () => ({})
    },
    {
        id: 'assembly',
        name: 'Assembly Rejection Report',
        signaturePatterns: [/ASSEMBLY SECTION/i, /VISUAL.*QTY/i],
        stage: 'assembly',
        headerPattern: /(DATE|MONTH).*(QTY|REJ|VISUAL|FINAL)/i,
        producedColumnPatterns: [/VISUAL.*QTY/i, /FINAL.*CHECKED.*QTY/i],
        // Note: Total Produced might be Visual Qty? Or Final Check?
        // Usually Produced = Input. Visual Qty is the input to the line.

        extractDefects: (headers: string[], row: any[]) => {
            const defects: Record<string, number> = {};

            // State machine to track category based on headers
            let currentCategory = 'Unknown';

            headers.forEach((h, idx) => {
                const header = (h || '').toUpperCase();

                if (header.includes('VISUAL')) currentCategory = 'Visual';
                else if (header.includes('BALLOON')) currentCategory = 'Balloon';
                else if (header.includes('VALVE')) currentCategory = 'Valve';
                else if (header.includes('FINAL')) currentCategory = 'Final';

                // If it's a Rejection Column
                if ((header.includes('REJ') || header.includes('REJECTION')) && !header.includes('%')) {
                    // Check if it's "TOTAL REJ" -> Skip (aggregate)
                    if (header.includes('TOTAL')) return;

                    const val = parseNum(row[idx]);
                    if (val > 0) {
                        const key = `${currentCategory} Defect`;
                        defects[key] = (defects[key] || 0) + val;
                    }
                }
            });
            return defects;
        }
    },
    {
        id: 'balloon_valve',
        name: 'Balloon & Valve Integrity Report',
        signaturePatterns: [/BALLOON.*VALVE.*INTEGRITY/i, /STRUCK BALLOON/i],
        stage: 'balloon',
        headerPattern: /(DATE|MONTH).*(QTY|REJ|CHECKED)/i,
        producedColumnPatterns: [/CHECKED QTY/i],
        extractDefects: (headers: string[], row: any[]) => {
            const defects: Record<string, number> = {};
            const simpleMap: Record<string, RegExp> = {
                'Struck Balloon': /STRUCK BALLOON/i,
                'Balloon Burst': /BALLOON BRUST|BALLOON BURST/i,
                'Leakage': /LEAKAGE/i,
                '90/10 Defect': /90\/10/i,
                'Bubble': /BUBBLE/i,
                'Thin Spot': /THIN SPOD|THIN SPOT/i,
                'Other': /OTHERS/i
            };

            headers.forEach((h, idx) => {
                const header = (h || '').toUpperCase();
                for (const [name, pattern] of Object.entries(simpleMap)) {
                    if (pattern.test(header) && !header.includes('%')) {
                        const val = parseNum(row[idx]);
                        if (val > 0) {
                            defects[name] = (defects[name] || 0) + val;
                        }
                    }
                }
            });
            return defects;
        }
    },
    {
        id: 'visual',
        name: 'Visual Inspection Report',
        signaturePatterns: [/VISUAL INSPECTION REPORT/i],
        stage: 'visual',
        headerPattern: /(DATE|MONTH|S\.NO).*(QTY|REJ|INSPECTED|PROD)/i,
        producedColumnPatterns: [/TOTAL.*INSPECTED/i, /PROD.*QTY/i],
        extractDefects: (headers: string[], row: any[]) => {
            const defects: Record<string, number> = {};
            // Visual usually has specific columns like 'Particle', 'Tip', etc.
            // Or generic 'REJ QTY'.
            // If generic, we tag it 'Visual Defect'.
            headers.forEach((h, idx) => {
                const header = (h || '').toUpperCase();
                if (header.includes('REJ') && !header.includes('%') && !header.includes('TOTAL')) {
                    const val = parseNum(row[idx]);
                    if (val > 0) defects['Visual Defect'] = (defects['Visual Defect'] || 0) + val;
                }
            });
            return defects;
        }
    }
];

function parseNum(val: any): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
}
