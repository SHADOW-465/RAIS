/**
 * Example React Component: KPICard
 * Reusable KPI display card with WCAG AAA compliance
 */

import React from 'react';

export interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  icon,
  variant = 'default',
  loading = false,
}: KPICardProps) {
  const colorMap = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  const changeColorMap = {
    up: 'text-danger',    // Up = worse for rejection rates
    down: 'text-success', // Down = better for rejection rates
  };

  if (loading) {
    return (
      <div className="kpi-card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-12 bg-gray-300 rounded w-24 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  return (
    <div
      className="kpi-card"
      role="region"
      aria-label={`${title} KPI card`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="kpi-label">
            {title}
          </p>

          {/* Value */}
          <p
            className={`kpi-value ${colorMap[variant]}`}
            aria-label={`${title} value: ${value}`}
          >
            {value}
          </p>

          {/* Change indicator */}
          {change && (
            <div className="kpi-change">
              <span
                className={`font-medium ${changeColorMap[change.direction]}`}
                aria-label={`${change.direction === 'up' ? 'Increased' : 'Decreased'} by ${Math.abs(change.value)}%`}
              >
                {change.direction === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
              <span className="text-text-tertiary">
                {change.label}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className="text-primary-light text-3xl ml-4" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example Usage:
 * 
 * <KPICard
 *   title="Overall Rejection Rate"
 *   value="8.2%"
 *   change={{ value: 1.2, direction: 'up', label: 'vs last month' }}
 *   variant="danger"
 *   icon={<span>📊</span>}
 * />
 */
