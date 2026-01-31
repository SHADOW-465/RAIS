'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { subDays } from 'date-fns';
import styles from './analysis.module.css';

interface ParetoItem {
  name: string;
  value: number;
  percentage: number;
  cumulativePercentage: number;
}

export default function DefectAnalysisPage() {
  const [dateRange, setDateRange] = useState(30);
  const [data, setData] = useState<ParetoItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPareto();
  }, [dateRange]);

  async function fetchPareto() {
    setLoading(true);
    setError(null);

    try {
      const to = new Date();
      const from = subDays(to, dateRange);

      const response = await fetch(
        `/api/analytics/pareto?from=${from.toISOString()}&to=${to.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pareto data');
      }

      const result = await response.json();
      setData(result.items);
      setTotalQuantity(result.totalQuantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Defect Analysis</h1>
          <p className={styles.subtitle}>Identify root causes of rejection</p>
        </div>
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            aria-label="Time Period"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>This Year</option>
          </select>
        </div>
      </header>

      <div className={styles.contentGrid}>
        {/* Pareto Chart Section */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Defect Pareto Chart</h2>
            <span className={styles.cardBadge}>Top Contributors</span>
          </div>
          <div className={styles.chartContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <span>Loading...</span>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <span>Error: {error}</span>
              </div>
            ) : data.length === 0 ? (
              <div className={styles.emptyState}>
                <span>No data available</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    axisLine={{ stroke: '#E6E8EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
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
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="value"
                    fill="#DC2626"
                    radius={[4, 4, 0, 0]}
                    name="Count"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePercentage"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={false}
                    name="Cumulative %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className={styles.chartFooter}>
            <span className={styles.totalLabel}>Total rejections:</span>
            <span className={styles.totalValue}>{totalQuantity.toLocaleString()}</span>
          </div>
        </section>

        {/* Top Defects Table */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top Defects Details</h2>
          </div>
          {loading ? (
            <div className={styles.tableLoading}>Loading...</div>
          ) : error ? (
            <div className={styles.tableError}>Error: {error}</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Defect</th>
                    <th className={styles.alignRight}>Count</th>
                    <th className={styles.alignRight}>Contribution</th>
                    <th className={styles.alignRight}>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((item, index) => (
                    <tr key={item.name}>
                      <td>
                        <div className={styles.defectCell}>
                          <span className={`${styles.rank} ${index < 3 ? styles.rankTop : ''}`}>
                            {index + 1}
                          </span>
                          <span className={styles.defectName}>{item.name}</span>
                        </div>
                      </td>
                      <td className={styles.alignRight}>{item.value.toLocaleString()}</td>
                      <td className={styles.alignRight}>
                        <span className={styles.percentage}>{item.percentage}%</span>
                      </td>
                      <td className={styles.alignRight}>
                        <span className={styles.cumulative}>{item.cumulativePercentage}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
