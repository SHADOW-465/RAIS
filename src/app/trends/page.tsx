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
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { format, subDays } from 'date-fns';
import TopBar from '@/components/TopBar';
import styles from './page.module.css';

interface TrendDataPoint {
  date: string;
  rejectionRate: number;
  produced: number;
  rejected: number;
  isAnomaly?: boolean;
}

export default function RejectionTrendsPage() {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [dateRange, setDateRange] = useState(30);
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data generation - will be replaced with API call
  useEffect(() => {
    generateMockData();
  }, [viewMode, dateRange]);

  function generateMockData() {
    setLoading(true);
    const mockData: TrendDataPoint[] = [];
    const days = viewMode === 'weekly' ? 30 : 180;
    
    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const baseRate = 2.5 + Math.random() * 2;
      const spike = Math.random() > 0.9 ? 3 : 0; // Occasional spikes
      const rate = baseRate + spike;
      
      mockData.push({
        date: date.toISOString(),
        rejectionRate: parseFloat(rate.toFixed(1)),
        produced: 1000 + Math.floor(Math.random() * 500),
        rejected: Math.floor(rate * 10),
        isAnomaly: spike > 0,
      });
    }
    
    setData(mockData);
    setLoading(false);
  }

  // Calculate comparison metrics
  const currentPeriod = data.slice(-Math.floor(data.length / 2));
  const previousPeriod = data.slice(0, Math.floor(data.length / 2));
  
  const currentAvg = currentPeriod.length > 0
    ? currentPeriod.reduce((sum, d) => sum + d.rejectionRate, 0) / currentPeriod.length
    : 0;
  
  const previousAvg = previousPeriod.length > 0
    ? previousPeriod.reduce((sum, d) => sum + d.rejectionRate, 0) / previousPeriod.length
    : 0;
  
  const delta = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), viewMode === 'weekly' ? 'MMM d' : 'MMM');
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting trends data...');
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(parseInt(range));
  };

  // Find anomalies for annotations
  const anomalies = data.filter(d => d.isAnomaly);

  return (
    <div className={styles.container}>
      <TopBar
        title="Rejection Trends"
        subtitle="Are we improving or deteriorating?"
        onDateRangeChange={handleDateRangeChange}
        onExport={handleExport}
      />

      <main className={styles.main}>
        {/* Section A: Trend Chart */}
        <section className={styles.chartSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Rejection Rate Over Time</h2>
              
              {/* Weekly/Monthly Toggle */}
              <div className={styles.toggleGroup}>
                <button
                  className={`${styles.toggleButton} ${viewMode === 'weekly' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('weekly')}
                >
                  Weekly
                </button>
                <button
                  className={`${styles.toggleButton} ${viewMode === 'monthly' ? styles.toggleActive : ''}`}
                  onClick={() => setViewMode('monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className={styles.chartContainer}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <span>Loading trends...</span>
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
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorRejection" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      labelFormatter={(label) => format(new Date(label as string), 'MMM d, yyyy')}
                      formatter={(value) => [`${value ?? 0}%`, 'Rejection Rate']}
                    />
                    
                    {/* Average line */}
                    <ReferenceLine 
                      y={currentAvg} 
                      stroke="#9CA3AF" 
                      strokeDasharray="3 3"
                      label={{ value: 'Avg', position: 'right', fill: '#9CA3AF', fontSize: 12 }}
                    />
                    
                    {/* Anomaly annotations */}
                    {anomalies.map((anomaly, idx) => (
                      <ReferenceDot
                        key={idx}
                        x={anomaly.date}
                        y={anomaly.rejectionRate}
                        r={6}
                        fill="#EF4444"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    ))}
                    
                    <Line
                      type="monotone"
                      dataKey="rejectionRate"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2, fill: '#fff' }}
                      name="Rejection Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Comparison Text */}
            <div className={styles.comparisonText}>
              <span className={delta > 0 ? styles.comparisonBad : styles.comparisonGood}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
              <span className={styles.comparisonLabel}> vs last period</span>
            </div>
          </div>
        </section>

        {/* Section B: Comparison Summary */}
        <section className={styles.comparisonSection}>
          <div className={styles.comparisonGrid}>
            {/* Current Period */}
            <div className={styles.comparisonChip}>
              <div className={styles.chipLabel}>Current Period</div>
              <div className={styles.chipValue}>{currentAvg.toFixed(1)}%</div>
            </div>

            {/* Previous Period */}
            <div className={styles.comparisonChip}>
              <div className={styles.chipLabel}>Previous Period</div>
              <div className={styles.chipValue}>{previousAvg.toFixed(1)}%</div>
            </div>

            {/* Delta */}
            <div className={styles.comparisonChip}>
              <div className={styles.chipLabel}>Change</div>
              <div className={`${styles.chipValue} ${delta > 0 ? styles.chipBad : styles.chipGood}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
              </div>
            </div>
          </div>
        </section>

        {/* Anomaly Legend */}
        {anomalies.length > 0 && (
          <section className={styles.anomalySection}>
            <div className={styles.anomalyCard}>
              <div className={styles.anomalyHeader}>
                <div className={styles.anomalyDot}></div>
                <span className={styles.anomalyTitle}>Abnormal Spikes Detected</span>
              </div>
              <p className={styles.anomalyText}>
                {anomalies.length} abnormal rejection rate spike{anomalies.length > 1 ? 's' : ''} detected. 
                Click on red dots in chart for details.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
