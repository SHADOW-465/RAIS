'use client';

import { useState } from 'react';
import { subDays, format } from 'date-fns';
import styles from './reports.module.css';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState(30);
  const [exportFormat, setExportFormat] = useState('csv');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generateReport = async () => {
    setGenerating(true);
    setMessage(null);
    
    try {
      const to = new Date();
      const from = subDays(to, dateRange);
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          dateRange: { from: from.toISOString(), to: to.toISOString() },
          format: exportFormat,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rais-report-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setMessage('Report downloaded successfully!');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
      </header>

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Report Type</label>
          <select 
            className={styles.select}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="summary">Summary Report</option>
            <option value="detailed">Detailed Report</option>
            <option value="trends">Trends Report</option>
            <option value="supplier">Supplier Report</option>
          </select>
          <p className={styles.hint}>Choose the type of analysis you need</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Date Range</label>
          <select 
            className={styles.select}
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <p className={styles.hint}>Select the time period for the report</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Export Format</label>
          <div className={styles.radioGroup}>
            <label className={styles.radio}>
              <input
                type="radio"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              <span>CSV (Excel)</span>
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                value="json"
                checked={exportFormat === 'json'}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              <span>JSON</span>
            </label>
          </div>
        </div>

        <button 
          className={styles.generateButton}
          onClick={generateReport}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Download Report'}
        </button>

        {message && (
          <div className={`${styles.message} ${message.includes('Error') ? styles.error : styles.success}`}>
            {message}
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h2 className={styles.infoTitle}>Report Types</h2>
        <ul className={styles.infoList}>
          <li><strong>Summary Report:</strong> Key metrics, KPIs, and high-level overview</li>
          <li><strong>Detailed Report:</strong> All rejection records with full details</li>
          <li><strong>Trends Report:</strong> Time-series analysis and forecasts</li>
          <li><strong>Supplier Report:</strong> Supplier quality scores and rankings</li>
        </ul>
      </div>
    </div>
  );
}
