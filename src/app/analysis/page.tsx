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
import { format, subDays } from 'date-fns';
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
        <h1 className={styles.title}>Defect Analysis</h1>
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
          <h2 className={styles.cardTitle}>Defect Pareto</h2>
          <div style={{ height: '350px', marginTop: '20px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div>Loading...</div>
              </div>
            ) : error ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
                <div>Error: {error}</div>
              </div>
            ) : data.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div>No data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E8EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                  
                  {/* Bar chart for count */}
                  <Bar
                    yAxisId="left"
                    dataKey="value"
                    fill="#D64545"
                    radius={[4, 4, 0, 0]}
                    name="Count"
                  />
                  
                  {/* Line chart for cumulative percentage */}
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
          <p style={{ marginTop: '1rem', color: '#6B7280', fontSize: '14px' }}>
            Total rejections: {totalQuantity.toLocaleString()}
          </p>
        </section>

        {/* Top Defects Table */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Top Defects Details</h2>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-danger)' }}>
              Error: {error}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Defect</th>
                  <th>Count</th>
                  <th>Contribution</th>
                  <th>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((item, index) => (
                  <tr key={item.name}>
                    <td>
                      <span style={{ 
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        background: index < 3 ? '#D64545' : '#E5E7EB',
                        color: index < 3 ? 'white' : '#374151',
                        borderRadius: '50%',
                        textAlign: 'center',
                        lineHeight: '24px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginRight: '8px'
                      }}>
                        {index + 1}
                      </span>
                      {item.name}
                    </td>
                    <td>{item.value.toLocaleString()}</td>
                    <td>{item.percentage}%</td>
                    <td>{item.cumulativePercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
