'use client';

import styles from './AttentionCard.module.css';

interface AttentionCardProps {
    title: string;
    description: string;
    aiConfidence?: number;
}

export default function AttentionCard({ title, description, aiConfidence }: AttentionCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.iconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <h2 className={styles.title}>{title}</h2>
                <div className={styles.aiIndicator}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                </div>
            </div>
            <p className={styles.description}>{description}</p>
        </div>
    );
}
