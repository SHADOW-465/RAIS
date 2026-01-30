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
import { subDays, format } from 'date-fns';
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Supplier Quality</h1>
        <div className={styles.controls}>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            style={{ padding: '10px 16px', fontSize: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>This Year</option>
          </select>
        </div>
      </header>

      <div className={styles.content}>
        {/* Supplier Scorecard Table */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Supplier Scorecard</h2>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>
              Error: {error}
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              No supplier data available for the selected period
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Rejections</th>
                    <th>Contribution</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((supplier) => (
                    <tr key={supplier.supplierId}>
                      <td style={{ fontWeight: 500 }}>{supplier.supplierName}</td>
                      <td>{supplier.totalRejections.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{supplier.contribution.toFixed(1)}%</span>
                          <div style={{ 
                            width: '60px', 
                            height: '6px', 
                            background: '#E6E8EB', 
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${supplier.contribution}%`,
                              height: '100%',
                              background: supplier.contribution > 30 ? '#D64545' : supplier.contribution > 15 ? '#D98A1F' : '#1F9D55',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: supplier.contribution > 30 ? '#FEE2E2' : supplier.contribution > 15 ? '#FEF3C7' : '#D1FAE5',
                          color: supplier.contribution > 30 ? '#DC2626' : supplier.contribution > 15 ? '#B45309' : '#15803D'
                        }}>
                          {supplier.contribution > 30 ? 'High Risk' : supplier.contribution > 15 ? 'Medium' : 'Good'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Comparison Chart */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Rejection by Supplier</h2>
          <div style={{ height: '300px', marginTop: '20px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                Loading...
              </div>
            ) : error ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
                Error loading chart
              </div>
            ) : data.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EB" />
                  <XAxis 
                    dataKey="supplierName" 
                    stroke="#6B7280"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E8EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                  <Bar 
                    dataKey="totalRejections" 
                    fill="#D64545" 
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
