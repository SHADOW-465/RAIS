'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import styles from './reports.module.css';

type ReportType = 'summary' | 'detailed' | 'comparison' | 'forecast';
type ReportFormat = 'pdf' | 'csv' | 'excel';

interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateFrom: string;
  dateTo: string;
  includeCharts: boolean;
  includeAI: boolean;
}

const REPORT_TYPES = [
  { value: 'summary', label: 'Executive Summary', description: 'High-level overview for executives' },
  { value: 'detailed', label: 'Detailed Analysis', description: 'In-depth breakdown of all metrics' },
  { value: 'comparison', label: 'Period Comparison', description: 'Compare performance across periods' },
  { value: 'forecast', label: 'AI Forecast Report', description: 'Predictive analysis with confidence intervals' },
];

const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'csv', label: 'CSV', icon: '📊' },
  { value: 'excel', label: 'Excel', icon: '📈' },
];

export default function ReportsPage() {
  const [config, setConfig] = useState<ReportConfig>({
    type: 'summary',
    format: 'pdf',
    dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    includeCharts: true,
    includeAI: true,
  });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGenerating(false);
    // In production, this would trigger actual report generation
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports & Exports</h1>
          <p className={styles.subtitle}>Generate custom reports and export data</p>
        </div>
      </header>

      <div className={styles.content}>
        {/* Report Type Selection */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Report Type</h2>
          <div className={styles.reportTypes}>
            {REPORT_TYPES.map((type) => (
              <button
                key={type.value}
                className={`${styles.reportType} ${config.type === type.value ? styles.active : ''}`}
                onClick={() => setConfig({ ...config, type: type.value as ReportType })}
              >
                <span className={styles.reportTypeLabel}>{type.label}</span>
                <span className={styles.reportTypeDesc}>{type.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Date Range */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Date Range</h2>
          <div className={styles.dateRange}>
            <div className={styles.dateField}>
              <label className={styles.label}>From</label>
              <input
                type="date"
                value={config.dateFrom}
                onChange={(e) => setConfig({ ...config, dateFrom: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.dateField}>
              <label className={styles.label}>To</label>
              <input
                type="date"
                value={config.dateTo}
                onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.quickRanges}>
            <button
              className={styles.quickRange}
              onClick={() => setConfig({
                ...config,
                dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                dateTo: format(new Date(), 'yyyy-MM-dd')
              })}
            >
              Last 7 days
            </button>
            <button
              className={styles.quickRange}
              onClick={() => setConfig({
                ...config,
                dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                dateTo: format(new Date(), 'yyyy-MM-dd')
              })}
            >
              Last 30 days
            </button>
            <button
              className={styles.quickRange}
              onClick={() => setConfig({
                ...config,
                dateFrom: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
                dateTo: format(new Date(), 'yyyy-MM-dd')
              })}
            >
              Last 90 days
            </button>
          </div>
        </section>

        {/* Export Format */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Export Format</h2>
          <div className={styles.formats}>
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                className={`${styles.format} ${config.format === fmt.value ? styles.active : ''}`}
                onClick={() => setConfig({ ...config, format: fmt.value as ReportFormat })}
              >
                <span className={styles.formatIcon}>{fmt.icon}</span>
                <span className={styles.formatLabel}>{fmt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Options */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Options</h2>
          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={config.includeCharts}
                onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
              />
              <span className={styles.checkmark}></span>
              <span>Include charts and visualizations</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={config.includeAI}
                onChange={(e) => setConfig({ ...config, includeAI: e.target.checked })}
              />
              <span className={styles.checkmark}></span>
              <span>Include AI insights and recommendations</span>
            </label>
          </div>
        </section>
      </div>

      {/* Generate Button */}
      <div className={styles.actions}>
        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <span className={styles.spinner}></span>
              Generating...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Generate Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}
