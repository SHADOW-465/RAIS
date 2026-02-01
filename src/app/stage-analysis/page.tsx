'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TopBar from '@/components/TopBar';
import styles from './page.module.css';

interface StageData {
  stage: string;
  produced: number;
  rejected: number;
  rate: number;
}

const MOCK_STAGE_DATA: StageData[] = [
  { stage: 'Shopfloor', produced: 45000, rejected: 675, rate: 1.5 },
  { stage: 'Assembly', produced: 42500, rejected: 1785, rate: 4.2 },
  { stage: 'Visual', produced: 48000, rejected: 1344, rate: 2.8 },
  { stage: 'Integrity', produced: 41000, rejected: 492, rate: 1.2 },
];

export default function StageAnalysisPage() {
  const [viewMode, setViewMode] = useState<'units' | 'percentage'>('percentage');

  const handleExport = () => {
    console.log('Exporting stage analysis...');
  };

  const handleDateRangeChange = (range: string) => {
    console.log('Date range changed:', range);
  };

  return (
    <div className={styles.container}>
      <TopBar
        title="Stage / Process Analysis"
        subtitle="Where in the process are failures originating?"
        onDateRangeChange={handleDateRangeChange}
        onExport={handleExport}
      />

      <main className={styles.main}>
        {/* Chart Section */}
        <section className={styles.chartSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Rejection Rate by Stage</h2>
              
              {/* Units / % Toggle */}
              <div className={styles.toggleGroup}>
                <button
                  className={`${styles.toggleButton} ${viewMode === 'units' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('units')}
                >
                  Units
                </button>
                <button
                  className={`${styles.toggleButton} ${viewMode === 'percentage' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('percentage')}
                >
                  %
                </button>
              </div>
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={MOCK_STAGE_DATA}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                  <XAxis
                    dataKey="stage"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 13, fontWeight: 500 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      viewMode === 'percentage' ? `${value}%` : value.toLocaleString()
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value) => {
                      const numValue = value ?? 0;
                      if (viewMode === 'percentage') {
                        return [`${numValue}%`, 'Rejection Rate'];
                      }
                      return [numValue.toLocaleString(), 'Rejected Units'];
                    }}
                  />
                  <Bar
                    dataKey={viewMode === 'percentage' ? 'rate' : 'rejected'}
                    fill="#F59E0B"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={80}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Table Section */}
        <section className={styles.tableSection}>
          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Stage Breakdown</h2>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th className={styles.alignRight}>Produced</th>
                    <th className={styles.alignRight}>Rejected</th>
                    <th className={styles.alignRight}>Rejection %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_STAGE_DATA.map((stage) => (
                    <tr key={stage.stage} className={styles.tableRow}>
                      <td className={styles.stageCell}>
                        <span className={styles.stageName}>{stage.stage}</span>
                      </td>
                      <td className={styles.alignRight}>
                        {stage.produced.toLocaleString()}
                      </td>
                      <td className={styles.alignRight}>
                        {stage.rejected.toLocaleString()}
                      </td>
                      <td className={styles.alignRight}>
                        <span
                          className={`${styles.rateValue} ${
                            stage.rate > 3
                              ? styles.rateHigh
                              : stage.rate > 1.5
                              ? styles.rateMedium
                              : styles.rateLow
                          }`}
                        >
                          {stage.rate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            stage.rate > 3
                              ? styles.statusHigh
                              : stage.rate > 1.5
                              ? styles.statusMedium
                              : styles.statusNormal
                          }`}
                        >
                          {stage.rate > 3 ? 'High Risk' : stage.rate > 1.5 ? 'Watch' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
