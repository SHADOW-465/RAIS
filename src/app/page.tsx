import { Suspense } from 'react';
import TopBar from '@/components/TopBar';
import KPICard from '@/components/KPICard';
import RiskBadge, { calculateRiskLevel } from '@/components/RiskBadge';
import styles from './page.module.css';
import { subDays, format } from 'date-fns';

// Mock data - will be replaced with Supabase data
const MOCK_BATCHES = [
  { id: 'BT-2025-089', product: 'Valve Assembly', defectType: 'Leak, Misalign', rejected: 45, produced: 1000, stagesFailed: 3 },
  { id: 'BT-2025-087', product: 'Pump Housing', defectType: 'Crack', rejected: 18, produced: 1500, stagesFailed: 2 },
  { id: 'BT-2025-085', product: 'Connector', defectType: 'Minor dent', rejected: 12, produced: 2000, stagesFailed: 1 },
  { id: 'BT-2025-084', product: 'Seal Ring', defectType: 'Scratch', rejected: 8, produced: 1200, stagesFailed: 1 },
  { id: 'BT-2025-083', product: 'Gasket', defectType: 'Color mismatch', rejected: 5, produced: 1800, stagesFailed: 1 },
];

const MOCK_KPI_DATA = {
  batchesAtRisk: { value: '12', delta: '2', direction: 'up' as const, isGood: false },
  avgDefectsPerBatch: { value: '3.2', delta: '0.5', direction: 'up' as const, isGood: false },
  scrapProbability: { value: '4.5%', delta: '1.2%', direction: 'up' as const, isGood: false },
  financialLoss: { value: '₹11.1M', delta: '₹2.3M', direction: 'up' as const, isGood: false },
};

function ExecutiveOverviewContent() {
  const today = new Date();
  const from = subDays(today, 30);

  // Calculate high risk batches
  const highRiskBatches = MOCK_BATCHES.filter(batch => {
    const rate = batch.rejected / batch.produced;
    return calculateRiskLevel(rate) === 'HIGH';
  });

  return (
    <div className={styles.container}>
      <TopBar
        title="Executive Overview"
        subtitle="Monitor manufacturing quality and batch risk status"
        userName="General Manager"
      />

      <main className={styles.main}>
        {/* Section 1: KPI Summary Cards */}
        <section className={styles.kpiSection}>
          <div className={styles.kpiRow}>
            <KPICard
              value={MOCK_KPI_DATA.batchesAtRisk.value}
              label="Batches at Risk"
              delta={{
                value: `${MOCK_KPI_DATA.batchesAtRisk.delta} new`,
                direction: MOCK_KPI_DATA.batchesAtRisk.direction,
                isGood: MOCK_KPI_DATA.batchesAtRisk.isGood,
              }}
              subtext="Require immediate attention"
              variant="alert"
            />
            <KPICard
              value={MOCK_KPI_DATA.avgDefectsPerBatch.value}
              label="Avg Defects per Batch"
              delta={{
                value: `${MOCK_KPI_DATA.avgDefectsPerBatch.delta} vs last period`,
                direction: MOCK_KPI_DATA.avgDefectsPerBatch.direction,
                isGood: MOCK_KPI_DATA.avgDefectsPerBatch.isGood,
              }}
              subtext="Industry avg: 2.1"
            />
            <KPICard
              value={MOCK_KPI_DATA.scrapProbability.value}
              label="Scrap Probability"
              delta={{
                value: `${MOCK_KPI_DATA.scrapProbability.delta} increase`,
                direction: MOCK_KPI_DATA.scrapProbability.direction,
                isGood: MOCK_KPI_DATA.scrapProbability.isGood,
              }}
              subtext="Based on rejection trends"
            />
            <KPICard
              value={MOCK_KPI_DATA.financialLoss.value}
              label="Potential Financial Loss"
              delta={{
                value: `${MOCK_KPI_DATA.financialLoss.delta} projected`,
                direction: MOCK_KPI_DATA.financialLoss.direction,
                isGood: MOCK_KPI_DATA.financialLoss.isGood,
              }}
              subtext="Next 30 days forecast"
            />
          </div>
        </section>

        {/* Section 2 & 3: High Risk Batch List + Insight Panel */}
        <section className={styles.batchSection}>
          {/* High Risk Batch List - 8 columns */}
          <div className={styles.batchListContainer}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>High Risk Batch List</h2>
              <div className={styles.timeFilter}>
                <button className={`${styles.filterButton} ${styles.filterActive}`}>Past 7 Days</button>
                <button className={styles.filterButton}>30 Days</button>
                <button className={styles.filterButton}>90 Days</button>
              </div>
            </div>

            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Product</th>
                    <th>Key Defect Type</th>
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
                        <td className={styles.product}>{batch.product}</td>
                        <td className={styles.defectType}>{batch.defectType}</td>
                        <td className={styles.riskCell}>
                          <RiskBadge level={riskLevel} />
                        </td>
                        <td className={styles.actionCell}>
                          <button className={styles.actionButton} aria-label={`Inspect batch ${batch.id}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

          {/* Insight Panel - 4 columns */}
          <div className={styles.insightPanel}>
            <div className={styles.insightCard}>
              <div className={styles.insightIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className={styles.insightTitle}>Quality Alert</h3>
              <p className={styles.insightText}>
                <strong>45% failure rate</strong> detected in valve assembly batches. 
                Leak defects from Supplier B are driving the rejection rate up.
              </p>
              <button className={styles.insightCta}>
                Inspect Batch #BT-2025-089
              </button>
            </div>

            {/* Secondary insight */}
            <div className={`${styles.insightCard} ${styles.insightSecondary}`}>
              <div className={`${styles.insightIcon} ${styles.insightIconSecondary}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <h3 className={styles.insightTitle}>Recommendation</h3>
              <p className={styles.insightText}>
                Consider increasing sampling rate for Assembly stage to catch defects earlier.
              </p>
              <button className={`${styles.insightCta} ${styles.insightCtaSecondary}`}>
                Review Process
              </button>
            </div>
          </div>
        </section>

        {/* Date Range Footer */}
        <footer className={styles.dateFooter}>
          <span>Data period: {format(from, 'MMM d')} - {format(today, 'MMM d, yyyy')}</span>
        </footer>
      </main>
    </div>
  );
}

export default function ExecutiveOverviewPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading executive overview...</div>}>
      <ExecutiveOverviewContent />
    </Suspense>
  );
}
