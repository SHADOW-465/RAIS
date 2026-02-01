import { Suspense } from 'react';
import TopBar from '@/components/TopBar';
import RiskBadge, { calculateRiskLevel } from '@/components/RiskBadge';
import styles from './page.module.css';
import { subDays, format } from 'date-fns';

// Mock data for now - will be replaced with Supabase data in Wave 4
const MOCK_BATCHES = [
  { id: 'BT-2025-089', produced: 1000, rejected: 45, stagesFailed: 3, defects: ['Leak', 'Misalign'] },
  { id: 'BT-2025-087', produced: 1500, rejected: 18, stagesFailed: 2, defects: ['Crack'] },
  { id: 'BT-2025-085', produced: 2000, rejected: 12, stagesFailed: 1, defects: ['Minor dent'] },
  { id: 'BT-2025-084', produced: 1200, rejected: 8, stagesFailed: 1, defects: ['Scratch'] },
  { id: 'BT-2025-083', produced: 1800, rejected: 5, stagesFailed: 1, defects: ['Color mismatch'] },
  { id: 'BT-2025-082', produced: 2500, rejected: 3, stagesFailed: 0, defects: [] },
];

function calculateBatchStats(batches: typeof MOCK_BATCHES) {
  const total = batches.length;
  const highRisk = batches.filter(b => calculateRiskLevel(b.rejected / b.produced) === 'HIGH').length;
  const watch = batches.filter(b => calculateRiskLevel(b.rejected / b.produced) === 'WATCH').length;
  const normal = total - highRisk - watch;
  
  return { total, highRisk, watch, normal };
}

function BatchRiskContent() {
  const stats = calculateBatchStats(MOCK_BATCHES);
  const today = new Date();
  const from = subDays(today, 30);

  return (
    <div className={styles.container}>
      <TopBar
        title="Batch Risk Assessment"
        subtitle="Identify batches requiring immediate quality intervention"
        userName="General Manager"
      />

      <main className={styles.main}>
        {/* Risk Summary Cards */}
        <section className={styles.summarySection}>
          <div className={styles.summaryGrid}>
            {/* Total Batches */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{stats.total}</div>
              <div className={styles.summaryLabel}>Total Batches Monitored</div>
              <div className={styles.summaryPeriod}>Last 30 days</div>
            </div>

            {/* At Risk */}
            <div className={`${styles.summaryCard} ${styles.highRiskCard}`}>
              <div className={`${styles.summaryValue} ${styles.highRiskValue}`}>
                {stats.highRisk}
              </div>
              <div className={styles.summaryLabel}>At Risk</div>
              <div className={styles.summaryBadge}>
                <RiskBadge level="HIGH" />
              </div>
            </div>

            {/* Under Observation */}
            <div className={`${styles.summaryCard} ${styles.watchCard}`}>
              <div className={`${styles.summaryValue} ${styles.watchValue}`}>
                {stats.watch}
              </div>
              <div className={styles.summaryLabel}>Under Observation</div>
              <div className={styles.summaryBadge}>
                <RiskBadge level="WATCH" />
              </div>
            </div>
          </div>
        </section>

        {/* Batch Risk List */}
        <section className={styles.listSection}>
          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>Batch Risk List</h2>
              <div className={styles.dateRange}>
                {format(from, 'MMM d')} - {format(today, 'MMM d, yyyy')}
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Failed Inspections</th>
                    <th>Rejected Units</th>
                    <th>Rejection %</th>
                    <th>Risk Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_BATCHES.map((batch) => {
                    const rejectionRate = batch.rejected / batch.produced;
                    const riskLevel = calculateRiskLevel(rejectionRate);
                    
                    return (
                      <tr key={batch.id} className={styles.tableRow}>
                        <td className={styles.batchId}>{batch.id}</td>
                        <td className={styles.stagesFailed}>
                          <span className={styles.stageCount}>{batch.stagesFailed}</span>
                          <span className={styles.stageLabel}>stages</span>
                        </td>
                        <td className={styles.rejectedUnits}>
                          {batch.rejected.toLocaleString()}
                        </td>
                        <td className={styles.rejectionRate}>
                          {(rejectionRate * 100).toFixed(1)}%
                        </td>
                        <td className={styles.riskCell}>
                          <RiskBadge level={riskLevel} />
                        </td>
                        <td className={styles.actionCell}>
                          <button 
                            className={styles.actionButton}
                            aria-label={`View details for batch ${batch.id}`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function BatchRiskPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading batch risk data...</div>}>
      <BatchRiskContent />
    </Suspense>
  );
}
