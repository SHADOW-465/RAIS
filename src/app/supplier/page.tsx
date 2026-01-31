'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { subDays } from 'date-fns';
import styles from './supplier.module.css';

interface SupplierData {
  supplierId: number;
  supplierName: string;
  totalUnits: number;
  totalRejections: number;
  rejectionRate: number;
  contribution: number;
}

export default function SupplierPage() {
  const [dateRange, setDateRange] = useState(30);
  const [data, setData] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [dateRange]);

  async function fetchSuppliers() {
    setLoading(true);
    setError(null);

    try {
      const to = new Date();
      const from = subDays(to, dateRange);

      const response = await fetch(
        `/api/analytics/suppliers?from=${from.toISOString()}&to=${to.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch supplier data');
      }

      const result = await response.json();
      setData(result.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (contribution: number) => {
    if (contribution > 30) return { label: 'Critical', class: styles.statusCritical };
    if (contribution > 15) return { label: 'Watch', class: styles.statusWatch };
    return { label: 'Stable', class: styles.statusStable };
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Supplier Quality</h1>
          <p className={styles.subtitle}>Monitor vendor performance and quality metrics</p>
        </div>
        <div className={styles.controls}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className={styles.select}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>This Year</option>
          </select>
        </div>
      </header>

      {/* Supplier Cards Grid */}
      <div className={styles.cardsGrid}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <span>Loading suppliers...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>Error: {error}</div>
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>No supplier data available</div>
        ) : (
          data.slice(0, 6).map((supplier, index) => {
            const status = getStatusInfo(supplier.contribution);
            return (
              <div key={supplier.supplierId} className={styles.supplierCard} style={{ animationDelay: `${index * 0.05}s` }}>
                <div className={styles.supplierHeader}>
                  <h3 className={styles.supplierName}>{supplier.supplierName}</h3>
                  <span className={`${styles.status} ${status.class}`}>{status.label}</span>
                </div>
                <div className={styles.supplierStats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{supplier.totalRejections.toLocaleString()}</span>
                    <span className={styles.statLabel}>Rejections</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{supplier.contribution.toFixed(1)}%</span>
                    <span className={styles.statLabel}>Contribution</span>
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(supplier.contribution, 100)}%`,
                      backgroundColor: supplier.contribution > 30 ? 'var(--color-danger)' :
                        supplier.contribution > 15 ? 'var(--color-warning)' : 'var(--color-success)'
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.content}>
        {/* Supplier Scorecard Table */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Supplier Scorecard</h2>
          </div>
          {loading ? (
            <div className={styles.tableLoading}>Loading...</div>
          ) : error ? (
            <div className={styles.tableError}>Error: {error}</div>
          ) : data.length === 0 ? (
            <div className={styles.tableEmpty}>No supplier data available for the selected period</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th className={styles.alignRight}>Rejections</th>
                    <th className={styles.alignRight}>Contribution</th>
                    <th className={styles.alignRight}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((supplier) => {
                    const status = getStatusInfo(supplier.contribution);
                    return (
                      <tr key={supplier.supplierId}>
                        <td className={styles.supplierCell}>{supplier.supplierName}</td>
                        <td className={styles.alignRight}>{supplier.totalRejections.toLocaleString()}</td>
                        <td className={styles.alignRight}>
                          <div className={styles.contributionCell}>
                            <span>{supplier.contribution.toFixed(1)}%</span>
                            <div className={styles.miniBar}>
                              <div
                                className={styles.miniBarFill}
                                style={{
                                  width: `${supplier.contribution}%`,
                                  backgroundColor: supplier.contribution > 30 ? 'var(--color-danger)' :
                                    supplier.contribution > 15 ? 'var(--color-warning)' : 'var(--color-success)'
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className={styles.alignRight}>
                          <span className={`${styles.statusBadge} ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Comparison Chart */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Rejection by Supplier</h2>
          </div>
          <div className={styles.chartContainer}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <span>Loading...</span>
              </div>
            ) : error ? (
              <div className={styles.errorState}>Error loading chart</div>
            ) : data.length === 0 ? (
              <div className={styles.emptyState}>No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" vertical={false} />
                  <XAxis
                    dataKey="supplierName"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                  />
                  <Bar
                    dataKey="totalRejections"
                    fill="#DC2626"
                    radius={[4, 4, 0, 0]}
                    name="Rejections"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
