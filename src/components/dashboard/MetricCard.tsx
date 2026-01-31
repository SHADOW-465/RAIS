import styles from './MetricCard.module.css';

interface MetricCardProps {
    title?: string;
    value: string;
    subtext?: string;
    delta?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
        isGood: boolean;
    };
    secondary?: string;
    size?: 'default' | 'large';
}

export default function MetricCard({
    title,
    value,
    subtext,
    delta,
    secondary,
    size = 'default'
}: MetricCardProps) {
    const getDeltaClass = () => {
        if (!delta) return '';
        if (delta.isGood) return styles.deltaGood;
        return styles.deltaBad;
    };

    const getDeltaIcon = () => {
        if (!delta) return null;
        if (delta.direction === 'up') {
            return (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                </svg>
            );
        }
        if (delta.direction === 'down') {
            return (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            );
        }
        return null;
    };

    return (
        <div className={`${styles.card} ${size === 'large' ? styles.large : ''}`}>
            <div className={styles.value}>{value}</div>
            {delta && (
                <div className={`${styles.delta} ${getDeltaClass()}`}>
                    {getDeltaIcon()}
                    <span>{delta.value}</span>
                </div>
            )}
            <div className={styles.subtext}>{subtext}</div>
            {secondary && <div className={styles.secondary}>{secondary}</div>}
        </div>
    );
}
