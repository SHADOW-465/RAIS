import styles from './KPICard.module.css';

interface DeltaIndicator {
  value: string;
  direction: 'up' | 'down' | 'neutral';
  isGood: boolean;
}

interface KPICardProps {
  value: string;
  label: string;
  delta?: DeltaIndicator;
  subtext?: string;
  variant?: 'default' | 'alert';
}

export default function KPICard({
  value,
  label,
  delta,
  subtext,
  variant = 'default',
}: KPICardProps) {
  const getDeltaIcon = () => {
    if (delta?.direction === 'up') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    }
    if (delta?.direction === 'down') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      );
    }
    return null;
  };

  const getDeltaClass = () => {
    if (!delta) return '';
    if (delta.direction === 'neutral') return styles.deltaNeutral;
    if (delta.isGood) return styles.deltaGood;
    return styles.deltaBad;
  };

  return (
    <div className={`${styles.card} ${variant === 'alert' ? styles.alert : ''}`}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      
      {delta && (
        <div className={`${styles.delta} ${getDeltaClass()}`}>
          <span className={styles.deltaIcon}>{getDeltaIcon()}</span>
          <span className={styles.deltaValue}>{delta.value}</span>
        </div>
      )}
      
      {subtext && <div className={styles.subtext}>{subtext}</div>}
    </div>
  );
}
