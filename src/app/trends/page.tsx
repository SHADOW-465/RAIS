'use client';

import styles from './trends.module.css';

export default function RejectionTrendsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Rejection Trends</h1>
                <div className={styles.controls}>
                    <select style={{ padding: '8px' }}>
                        <option>Last 30 days</option>
                        <option>Last 90 days</option>
                        <option>This Year</option>
                    </select>
                    <select style={{ padding: '8px' }}>
                        <option>All Factories</option>
                        <option>Factory A</option>
                    </select>
                </div>
            </header>

            <main className={styles.chartContainer}>
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {/* Mock Chart SVG */}
                    <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="250" x2="800" y2="250" stroke="#e5e7eb" strokeWidth="1" />
                        <line x1="0" y1="150" x2="800" y2="150" stroke="#e5e7eb" strokeWidth="1" />
                        <line x1="0" y1="50" x2="800" y2="50" stroke="#e5e7eb" strokeWidth="1" />

                        {/* Confidence Band */}
                        <path d="M0 200 C 200 180, 400 160, 600 140 L 800 120 V 160 L 600 180 C 400 200, 200 220, 0 240 Z" fill="#D1FAE5" opacity="0.5" />

                        {/* Actual Trend Line */}
                        <path d="M0 220 C 50 215, 100 210, 150 200 S 250 180, 300 170 S 400 160, 450 155" fill="none" stroke="#1F9D55" strokeWidth="3" />

                        {/* Forecast Line (Dashed) */}
                        <path d="M450 155 C 500 150, 600 140, 800 130" fill="none" stroke="#1F9D55" strokeWidth="2" strokeDasharray="5,5" />

                        {/* Labels handled via HTML overlay for simplicity or text SVG */}
                        <text x="750" y="120" fill="#1F9D55" fontSize="12">Forecast</text>
                    </svg>
                </div>
                <p style={{ marginTop: '1rem', color: '#6B7280' }}>
                    Showing Rejection Rate trends with 95% confidence interval forecast.
                </p>
            </main>

            <div className={styles.actions}>
                <button className={styles.button}>Download CSV</button>
            </div>
        </div>
    );
}
