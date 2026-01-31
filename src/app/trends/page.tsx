'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, subDays } from 'date-fns';
import styles from './trends.module.css';

interface TrendDataPoint {
  date: string;
  rejectionCount: number;
  incidentCount: number;
  totalCost: number;
  rejectionRate: number;
  forecast?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
}

interface ComparisonData {
  currentPeriod: { total: number; avgPerDay: number };
  previousPeriod: { total: number; avgPerDay: number };
  change: { absolute: number; percentage: number };
}

export default function RejectionTrendsPage() {
  const [dateRange, setDateRange] = useState(30);
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrends();
  }, [dateRange]);

  async function fetchTrends() {
    setLoading(true);
    setError(null);

    try {
      const to = new Date();
      const from = subDays(to, dateRange);

      const response = await fetch(
        `/api/analytics/trends?from=${from.toISOString()}&to=${to.toISOString()}&granularity=day`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }

      const result = await response.json();
      setData(result.series);
      setComparison(result.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d');
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Rejection Count', 'Incidents', 'Total Cost', 'Rejection Rate'];
    const rows = data.map(row => [
      formatDate(row.date),
      row.rejectionCount,
      row.incidentCount,
      row.totalCost,
      row.rejectionRate,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rejection-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Rejection Trends</h1>
          <p className={styles.subtitle}>Track quality metrics over time</p>
        </div>
        <div className={styles.controls}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className={styles.select}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>This Year</option>
          </select>
        </div>
      </header>

      {/* Comparison Stats */}
      {comparison && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Current Period</div>
            <div className={styles.statValue}>{comparison.currentPeriod.total.toLocaleString()}</div>
            <div className={styles.statSubtext}>rejections</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Previous Period</div>
            <div className={styles.statValue}>{comparison.previousPeriod.total.toLocaleString()}</div>
            <div className={styles.statSubtext}>rejections</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Change</div>
            <div className={`${styles.statValue} ${comparison.change.percentage > 0 ? styles.statDanger : styles.statSuccess}`}>
              {comparison.change.percentage > 0 ? '+' : ''}{comparison.change.percentage}%
            </div>
            <div className={styles.statSubtext}>
              {comparison.change.absolute > 0 ? '+' : ''}{comparison.change.absolute} rejections
            </div>
          </div>
        </div>
      )}

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Daily Rejection Count</h2>
        </div>
        <div className={styles.chartContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <span>Loading trends...</span>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Error: {error}</span>
            </div>
          ) : data.length === 0 ? (
            <div className={styles.emptyState}>
              <span>No data available for the selected period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRejection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F9D55" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1F9D55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#E6E8EB' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E8EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  labelFormatter={(label) => formatDate(label as string)}
                />
                <ReferenceLine y={comparison?.currentPeriod?.avgPerDay || 0} stroke="#DC2626" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="rejectionCount"
                  stroke="#1F9D55"
                  strokeWidth={2.5}
                  fill="url(#colorRejection)"
                  dot={false}
                  activeDot={{ r: 6, stroke: '#1F9D55', strokeWidth: 2, fill: '#fff' }}
                  name="Rejections"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className={styles.chartHint}>
          Showing daily rejection counts. Hover for details. Red dashed line shows average.
        </p>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={downloadCSV}
          disabled={loading || data.length === 0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download CSV
        </button>
      </div>
    </div>
  );
}
