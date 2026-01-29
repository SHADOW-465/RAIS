'use client';

import styles from './analysis.module.css';

const DEFECT_DATA = [
    { name: 'Leak', count: 1350, percent: 54.8 },
    { name: 'Scratch', count: 630, percent: 16.8 },
    { name: 'Misalignment', count: 670, percent: 12.4 },
    { name: 'Burr', count: 210, percent: 5.2 },
    { name: 'Other', count: 80, percent: 1.8 },
];

export default function DefectAnalysisPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Defect Analysis</h1>
                <div className={styles.filterBar}>
                    <select className={styles.select} aria-label="Line"><option>Line 3 (Night)</option></select>
                    <select className={styles.select} aria-label="Shift"><option>Night Shift</option></select>
                    <select className={styles.select} aria-label="Product"><option>All Products</option></select>
                </div>
            </header>

            <div className={styles.contentGrid}>
                {/* Pareto Chart Section */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Defect Pareto</h2>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        {DEFECT_DATA.map((item, i) => (
                            <div key={item.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '15%' }}>
                                <div style={{
                                    width: '100%',
                                    height: `${(item.percent / 60) * 100}%`,
                                    background: i === 0 ? '#D64545' : '#E5E7EB', // Highlight top risk
                                    borderRadius: '4px 4px 0 0'
                                }}></div>
                                <span style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 500 }}>{item.name}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Top Defects Table */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Top Defects Details</h2>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Defect</th>
                                <th>Count</th>
                                <th>Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DEFECT_DATA.map(item => (
                                <tr key={item.name}>
                                    <td>{item.name}</td>
                                    <td>{item.count.toLocaleString()}</td>
                                    <td>
                                        <div className={styles.barContainer}>
                                            <span>{item.percent}%</span>
                                            <div className={styles.bar} style={{ width: `${item.percent}px`, background: item.percent > 20 ? '#D64545' : '#E5E7EB' }}></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}
