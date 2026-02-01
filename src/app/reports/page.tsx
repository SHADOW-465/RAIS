'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';
import styles from './page.module.css';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  lastGenerated?: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    id: 'monthly',
    title: 'Monthly Rejection Summary',
    description: 'Complete overview of rejection statistics including rates, costs, and trends for the month.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    lastGenerated: 'Jan 15, 2025',
  },
  {
    id: 'pareto',
    title: 'Defect Pareto Report',
    description: 'Detailed Pareto analysis showing top defect types and their contribution to total rejections.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </svg>
    ),
    lastGenerated: 'Jan 14, 2025',
  },
  {
    id: 'batch',
    title: 'Batch Risk Report',
    description: 'Comprehensive batch risk assessment with risk levels, stages failed, and recommended actions.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'stage',
    title: 'Stage-wise Report',
    description: 'Process stage analysis showing rejection rates by production stage with trend analysis.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="M12 2l4 4" />
        <path d="M12 2l-4 4" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    lastGenerated: 'Jan 13, 2025',
  },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleExport = (reportId: string, format: 'excel' | 'pdf') => {
    setGenerating(`${reportId}-${format}`);
    // Simulate generation
    setTimeout(() => {
      setGenerating(null);
      console.log(`Generated ${reportId} as ${format}`);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <TopBar
        title="Reports"
        subtitle="What do I export or audit?"
      />

      <main className={styles.main}>
        {/* Report Cards Grid */}
        <section className={styles.grid}>
          {REPORT_CARDS.map((report) => (
            <div key={report.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.iconWrapper}>{report.icon}</div>
                <h3 className={styles.cardTitle}>{report.title}</h3>
              </div>
              
              <p className={styles.cardDescription}>{report.description}</p>
              
              {report.lastGenerated && (
                <div className={styles.lastGenerated}>
                  Last generated: {report.lastGenerated}
                </div>
              )}
              
              <div className={styles.cardActions}>
                <button
                  className={styles.exportButton}
                  onClick={() => handleExport(report.id, 'excel')}
                  disabled={generating === `${report.id}-excel`}
                >
                  {generating === `${report.id}-excel` ? (
                    <>
                      <span className={styles.spinner} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Excel
                    </>
                  )}
                </button>
                
                <button
                  className={`${styles.exportButton} ${styles.exportButtonSecondary}`}
                  onClick={() => handleExport(report.id, 'pdf')}
                  disabled={generating === `${report.id}-pdf`}
                >
                  {generating === `${report.id}-pdf` ? (
                    <>
                      <span className={styles.spinner} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                      </svg>
                      PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
