/**
 * Example React Component: RiskBadge
 * Risk level indicator with WCAG AAA compliance
 */

import React from 'react';
import type { RiskLevel } from '@/lib/db/schema.types';

export interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ level, showIcon = true, size = 'md' }: RiskBadgeProps) {
  const config = {
    normal: {
      label: 'Normal',
      color: 'bg-success text-white',
      icon: '✓',
      ariaLabel: 'Normal risk level',
    },
    watch: {
      label: 'Watch',
      color: 'bg-warning text-white',
      icon: '⚠',
      ariaLabel: 'Watch risk level - requires monitoring',
    },
    high_risk: {
      label: 'High Risk',
      color: 'bg-danger text-white',
      icon: '⚠',
      ariaLabel: 'High risk level - immediate attention required',
    },
  };

  const sizeMap = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  const { label, color, icon, ariaLabel } = config[level];

  return (
    <span
      className={`risk-badge ${color} ${sizeMap[size]}`}
      role="status"
      aria-label={ariaLabel}
    >
      {showIcon && (
        <span className="mr-2" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="font-semibold">{label}</span>
    </span>
  );
}

/**
 * Example Usage:
 * 
 * <RiskBadge level="high_risk" />
 * <RiskBadge level="watch" size="sm" showIcon={false} />
 */
