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
  Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import TopBar from '@/components/TopBar';
import SlidePanel from '@/components/SlidePanel';
import styles from './page.module.css';

interface DefectItem {
  name: string;
  value: number;
  percentage: number;
  cumulativePercentage: number;
  trend: 'up' | 'down' | 'stable';
  affectedStages: string[];
  affectedBatches: string[];
}

export default function DefectAnalysisPage() {
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [data, setData] = useState<DefectItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  // Mock data - will be replaced with API
  useEffect(() => {
    generateMockData();
  }, [dateRange]);

  function generateMockData() {
    setLoading(true);
    const mockDefects = [
      { name: 'Leak', value: 445, trend: 'up' as const, affectedStages: ['Assembly', 'Integrity'], affectedBatches: ['BT-2025-089', 'BT-2025-087', 'BT-2025-085'] },
      { name: 'Misalign', value: 312, trend: 'up' as const, affectedStages: ['Assembly'], affectedBatches: ['BT-2025-089', 'BT-2025-084'] },
      { name: 'Crack', value: 278, trend: 'stable' as const, affectedStages: ['Visual', 'Integrity'], affectedBatches: ['BT-2025-087', 'BT-2025-083'] },
      { name: 'Scratch', value: 156, trend: 'down' as const, affectedStages: ['Visual'], affectedBatches: ['BT-2025-084'] },
      { name: 'Dent', value: 98, trend: 'stable' as const, affectedStages: ['Shopfloor'], affectedBatches: ['BT-2025-085'] },
      { name: 'Color', value: 67, trend: 'down' as const, affectedStages: ['Visual'], affectedBatches: ['BT-2025-083'] },
    ];

    const total = mockDefects.reduce((sum, d) => sum + d.value, 0);
    let cumulative = 0;

    const paretoData = mockDefects.map((defect) => {
      const percentage = parseFloat(((defect.value / total) * 100).toFixed(1));
      cumulative += percentage;
      return {
        ...defect,
        percentage,
        cumulativePercentage: parseFloat(cumulative.toFixed(1)),
      };
    });

    // Only take top 5 for Pareto chart
    setData(paretoData.slice(0, 5));
    setTotalQuantity(total);
    setLoading(false);
  }

  const handleDefectClick = (defect: DefectItem) => {
    setSelectedDefect(defect);
    setIsPanelOpen(true);
  };

  const handleExport = () => {
    console.log('Exporting defect analysis...');
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(parseInt(range));
  };

  // Generate sparkline data for the side panel
  const generateSparklineData = () => {
    return Array.from({ length: 30 }, () => Math.floor(Math.random() * 20) + 5);
  };

  return (
    <div className={styles.container}>
      <TopBar
        title="Defect Analysis"
        subtitle="What defects hurt us the most?"
        onDateRangeChange={handleDateRangeChange}
        onExport={handleExport}
      />

      <main className={styles.main}>
        {/* Section A: Pareto Chart */}
        <section className={styles.chartSection}>
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Defect Contribution (Top 5)</h2>
              <span className={styles.cardBadge}>Pareto Analysis</span>
            </div>

            <div className={styles.chartContainer}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <span>Loading defect data...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12 }}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                      axisLine={{ stroke: '#E5E7EB' }}
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
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      formatter={(value, name) => {
                        const numValue = value ?? 0;
                        if (name === 'Count') return [numValue, 'Rejected Units'];
                        if (name === 'Cumulative %') return [`${numValue}%`, 'Cumulative'];
                        return [numValue, name];
                      }}
                    />

                    {/* Bars */}
                    <Bar
                      yAxisId="left"
                      dataKey="value"
                      name="Count"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : '#6B7280'}
                          onClick={() => handleDefectClick(entry)}
                        />
                      ))}
                    </Bar>

                    {/* Cumulative Line */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativePercentage"
                      name="Cumulative %"
                      stroke="#1F2937"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className={styles.chartFooter}>
              <span className={styles.totalLabel}>Total rejections:</span>
              <span className={styles.totalValue}>{totalQuantity.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Section B: Defect Table */}
        <section className={styles.tableSection}>
          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Defect Summary</h2>
            </div>

            {loading ? (
              <div className={styles.tableLoading}>Loading...</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Defect Name</th>
                      <th className={styles.alignRight}>Rejected Units</th>
                      <th className={styles.alignRight}>Contribution %</th>
                      <th className={styles.alignRight}>Trend</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr
                        key={item.name}
                        className={styles.tableRow}
                        onClick={() => handleDefectClick(item)}
                      >
                        <td>
                          <div className={styles.defectCell}>
                            <span
                              className={`${styles.rank} ${
                                index < 3 ? styles.rankTop : ''
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className={styles.defectName}>{item.name}</span>
                          </div>
                        </td>
                        <td className={styles.alignRight}>
                          {item.value.toLocaleString()}
                        </td>
                        <td className={styles.alignRight}>
                          <span className={styles.percentage}>{item.percentage}%</span>
                        </td>
                        <td className={styles.alignRight}>
                          <span
                            className={`${styles.trend} ${
                              item.trend === 'up'
                                ? styles.trendUp
                                : item.trend === 'down'
                                ? styles.trendDown
                                : styles.trendStable
                            }`}
                          >
                            {item.trend === 'up' && '↑'}
                            {item.trend === 'down' && '↓'}
                            {item.trend === 'stable' && '→'}
                          </span>
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            className={styles.viewButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDefectClick(item);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Side Panel for Defect Drill-down */}
      <SlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={selectedDefect ? `Defect: ${selectedDefect.name}` : 'Defect Details'}
      >
        {selectedDefect && (
          <div className={styles.panelContent}>
            {/* Stats */}
            <div className={styles.panelStats}>
              <div className={styles.panelStat}>
                <div className={styles.panelStatValue}>
                  {selectedDefect.value.toLocaleString()}
                </div>
                <div className={styles.panelStatLabel}>Rejected Units</div>
              </div>
              <div className={styles.panelStat}>
                <div className={styles.panelStatValue}>
                  {selectedDefect.percentage}%
                </div>
                <div className={styles.panelStatLabel}>Contribution</div>
              </div>
            </div>

            {/* Mini Sparkline */}
            <div className={styles.sparklineSection}>
              <h4 className={styles.panelSectionTitle}>30-Day Trend</h4>
              <div className={styles.sparkline}>
                {generateSparklineData().map((value, idx) => (
                  <div
                    key={idx}
                    className={styles.sparklineBar}
                    style={{ height: `${(value / 25) * 100}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Affected Stages */}
            <div className={styles.panelSection}>
              <h4 className={styles.panelSectionTitle}>Affected Stages</h4>
              <div className={styles.tagList}>
                {selectedDefect.affectedStages.map((stage) => (
                  <span key={stage} className={styles.stageTag}>
                    {stage}
                  </span>
                ))}
              </div>
            </div>

            {/* Affected Batches */}
            <div className={styles.panelSection}>
              <h4 className={styles.panelSectionTitle}>Affected Batches</h4>
              <div className={styles.batchList}>
                {selectedDefect.affectedBatches.map((batch) => (
                  <div key={batch} className={styles.batchItem}>
                    <span className={styles.batchId}>{batch}</span>
                    <button className={styles.inspectButton}>Inspect</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
