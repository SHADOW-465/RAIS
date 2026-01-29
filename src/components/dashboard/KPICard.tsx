import { ReactNode } from 'react';
import styles from './KPICard.module.css';

interface KPICardProps {
    title: string;
    value: string;
    delta?: { // Change vs last period
        value: string;
        direction: 'up' | 'down' | 'neutral';
        isGood: boolean; // e.g. Up can be bad for Rejection Rate
    };
    subtext?: string;
    children?: ReactNode; // For charts etc.
}

export default function KPICard({ title, value, delta, subtext, children }: KPICardProps) {
    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{title}</h3>

            <div className={styles.valueRow}>
                <span className={styles.value}>{value}</span>
                {delta && (
                    <span className={`${styles.delta} ${delta.isGood ? styles.positive : styles.negative}`}>
                        {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : ''} {delta.value}
                    </span>
                )}
            </div>

            {subtext && <div className={styles.subtext}>{subtext}</div>}

            {children && <div className={styles.contentSlot}>{children}</div>}
        </div>
    );
}
