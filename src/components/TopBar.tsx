'use client';

import { useState } from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  subtitle?: string;
  userName?: string;
  onDateRangeChange?: (range: string) => void;
  onExport?: () => void;
}

const DATE_RANGES = [
  { value: '7', label: 'Past 7 Days' },
  { value: '30', label: 'Past 30 Days' },
  { value: '90', label: 'Past 90 Days' },
];

export default function TopBar({
  title,
  subtitle,
  userName = 'General Manager',
  onDateRangeChange,
  onExport,
}: TopBarProps) {
  const [selectedRange, setSelectedRange] = useState('30');

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRange(value);
    onDateRangeChange?.(value);
  };

  // Get contextual greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <header className={styles.topbar}>
      {/* Left: Greeting and Page Info */}
      <div className={styles.left}>
        <div className={styles.greeting}>
          {getGreeting()}, <span className={styles.userName}>{userName}</span>
        </div>
        <div className={styles.pageInfo}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      {/* Right: Actions */}
      <div className={styles.right}>
        {/* Date Range Selector - Pill Style */}
        <div className={styles.dateSelector}>
          <select
            value={selectedRange}
            onChange={handleRangeChange}
            className={styles.dateSelect}
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Export Button - Primary Accent */}
        <button
          onClick={onExport}
          className={styles.exportButton}
          aria-label="Export data"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>

        {/* Profile Avatar */}
        <div className={styles.avatar}>
          <span className={styles.avatarInitials}>
            {userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
