import styles from './RiskBadge.module.css';

type RiskLevel = 'NORMAL' | 'WATCH' | 'HIGH';

interface RiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
}

const RISK_CONFIG = {
  NORMAL: {
    label: 'Normal',
    className: styles.normal,
  },
  WATCH: {
    label: 'Watch',
    className: styles.watch,
  },
  HIGH: {
    label: 'High Risk',
    className: styles.high,
  },
};

export default function RiskBadge({ level, showLabel = true }: RiskBadgeProps) {
  const config = RISK_CONFIG[level];

  return (
    <span className={`${styles.badge} ${config.className}`}>
      {/* Status Dot */}
      <span className={styles.dot} />
      
      {/* Label */}
      {showLabel && <span className={styles.label}>{config.label}</span>}
    </span>
  );
}

// Utility function to calculate risk level from rejection rate
export function calculateRiskLevel(rejectionRate: number): RiskLevel {
  if (rejectionRate > 0.01) return 'HIGH'; // > 1%
  if (rejectionRate > 0.005) return 'WATCH'; // 0.5% - 1%
  return 'NORMAL'; // < 0.5%
}
