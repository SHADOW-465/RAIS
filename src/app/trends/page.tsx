'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
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
        <h1 className={styles.title}>Rejection Trends</h1>
        <div className={styles.controls}>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
            style={{ padding: '10px 16px', fontSize: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            padding: '16px', 
            background: 'var(--color-bg-primary)', 
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Current Period</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{comparison.currentPeriod.total.toLocaleString()}</div>
            <div style={{ fontSize: '14px' }}>rejections</div>
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'var(--color-bg-primary)', 
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Previous Period</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{comparison.previousPeriod.total.toLocaleString()}</div>
            <div style={{ fontSize: '14px' }}>rejections</div>
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'var(--color-bg-primary)', 
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Change</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: comparison.change.percentage > 0 ? 'var(--color-danger)' : 'var(--color-success)'
            }}>
              {comparison.change.percentage > 0 ? '+' : ''}{comparison.change.percentage}%
            </div>
            <div style={{ fontSize: '14px' }}>
              {comparison.change.absolute > 0 ? '+' : ''}{comparison.change.absolute} rejections
            </div>
          </div>
        </div>
      )}

      <main className={styles.chartContainer}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div>Loading trends...</div>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
            <div>Error: {error}</div>
          </div>
        ) : data.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div>No data available for the selected period</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#6B7280"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#6B7280"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E6E8EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
                labelFormatter={(label) => formatDate(label as string)}
              />
              
              {/* Confidence band - show only if we have confidence data */}
              {data.some(d => d.confidenceLower !== undefined) && (
                <ReferenceArea
                  x1={data[data.length - 1]?.date}
                  x2={data[data.length - 1]?.date}
                  y1={data[data.length - 1]?.confidenceLower}
                  y2={data[data.length - 1]?.confidenceUpper}
                  fill="#D1FAE5"
                  fillOpacity={0.5}
                />
              )}
              
              {/* Actual trend line */}
              <Line
                type="monotone"
                dataKey="rejectionCount"
                stroke="#1F9D55"
                strokeWidth={3}
                dot={{ fill: '#1F9D55', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: '#1F9D55', strokeWidth: 2, fill: '#fff' }}
                name="Rejections"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        <p style={{ marginTop: '1rem', color: '#6B7280', fontSize: '14px' }}>
          Showing daily rejection counts. Click and drag to zoom, hover for details.
        </p>
      </main>

      <div className={styles.actions}>
        <button 
          className={styles.button}
          onClick={downloadCSV}
          disabled={loading || data.length === 0}
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
