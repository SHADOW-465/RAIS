'use client';

import HealthCard from '@/components/dashboard/HealthCard';
import KPICard from '@/components/dashboard/KPICard';
import styles from './page.module.css';

// Mock Data matching the minimal schema
const MOCK_DATA = {
  health: {
    status: 'WARNING' as const,
    summary: 'Rejection rate 3.2% ↑ 0.6% vs last month — driven by Leak defects on Line 3 (Night).',
    confidence: 0.78,
  },
  metrics: {
    rejectionRate: {
      value: '3.2%',
      delta: '0.6%',
      direction: 'up' as const,
      isGood: false, // Up is bad for rejection
      period: 'This month'
    },
    topRisk: {
      name: 'LEAK',
      contribution: '54.7%',
      line: 'Line 3'
    },
    costImpact: {
      value: '$84,230',
      projection: 'Proj: $95k',
      delta: '3.4%',
      isGood: false
    },
    forecast: {
      nextMonth: '3.4%',
      ci: '2.8% - 4.0%',
      confidence: '78%'
    }
  },
  actions: [
    { id: 1, desc: 'Assign maintenance for Line 3 Leaks', who: 'System', date: '2h ago' },
    { id: 2, desc: 'Update supplier specs for Gasket A', who: 'J. Smith', date: '1d ago' },
    { id: 3, desc: 'Review night shift training', who: 'M. Doe', date: '2d ago' },
  ]
};

export default function DashboardPage() {
  return (
    <div className={styles.container}>
      {/* Top Strip */}
      <HealthCard
        status={MOCK_DATA.health.status}
        summary={MOCK_DATA.health.summary}
        confidence={MOCK_DATA.health.confidence}
        onAssignAction={() => alert('Assign Action Modal Placeholder')}
      />

      {/* Controls Row (Placeholder) */}
      <div className={styles.controlsRow}>
        <select style={{ padding: '8px', borderRadius: '4px', border: '1px solid #E6E8EB' }}>
          <option>Last 30 days</option>
          <option>This Month</option>
        </select>
        <select style={{ padding: '8px', borderRadius: '4px', border: '1px solid #E6E8EB' }}>
          <option>All Factories</option>
          <option>Factory A</option>
        </select>
      </div>

      {/* Primary KPI Grid */}
      <div className={styles.kpiGrid}>
        <KPICard
          title="Rejection Rate"
          value={MOCK_DATA.metrics.rejectionRate.value}
          delta={{
            value: MOCK_DATA.metrics.rejectionRate.delta,
            direction: MOCK_DATA.metrics.rejectionRate.direction,
            isGood: MOCK_DATA.metrics.rejectionRate.isGood
          }}
          subtext={MOCK_DATA.metrics.rejectionRate.period}
        />

        <KPICard
          title="Top Risk"
          value={MOCK_DATA.metrics.topRisk.contribution}
          subtext={`${MOCK_DATA.metrics.topRisk.name} - ${MOCK_DATA.metrics.topRisk.line}`}
        >
          {/* Mini visualization for risk */}
          <div style={{ height: '4px', background: '#E6E8EB', borderRadius: '2px', marginTop: '8px', width: '100%' }}>
            <div style={{ height: '100%', background: '#D64545', width: '54%', borderRadius: '2px' }}></div>
          </div>
        </KPICard>

        <KPICard
          title="Cost Impact (30d)"
          value={MOCK_DATA.metrics.costImpact.value}
          delta={{
            value: MOCK_DATA.metrics.costImpact.delta,
            direction: 'up', // Assuming cost up is bad
            isGood: false
          }}
          subtext={MOCK_DATA.metrics.costImpact.projection}
        />

        <KPICard
          title="Trend Forecast"
          value={MOCK_DATA.metrics.forecast.nextMonth}
          subtext={`CI: ${MOCK_DATA.metrics.forecast.ci}`}
        >
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
            Confidence: {MOCK_DATA.metrics.forecast.confidence}
          </div>
          {/* Placeholder Sparkline */}
          <svg width="100%" height="30" style={{ marginTop: '8px' }}>
            <path d="M0 25 C 20 25, 40 20, 60 15 S 100 5, 140 5" fill="none" stroke="#1F9D55" strokeWidth="2" />
            <path d="M0 25 C 20 28, 40 25, 60 20 S 100 15, 140 10" fill="none" stroke="#1F9D55" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4" />
          </svg>
        </KPICard>
      </div>

      {/* Footer / Action Log */}
      <footer className={styles.footer}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Recent Actions</h3>
        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          {MOCK_DATA.actions.map(action => (
            <div key={action.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#FFFFFF', border: '1px solid #E6E8EB', borderRadius: '8px' }}>
              <span>{action.desc}</span>
              <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>{action.who} • {action.date}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
