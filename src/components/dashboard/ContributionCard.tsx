'use client';

import { useState } from 'react';
import styles from './ContributionCard.module.css';

interface ContributionItem {
    label: string;
    value: number;
    color?: string;
}

interface ContributionCardProps {
    title: string;
    tabs?: string[];
    data: Record<string, ContributionItem[]>;
    linkText?: string;
    linkHref?: string;
    summary?: string;
}

export default function ContributionCard({
    title,
    tabs = ['Line', 'Defect', 'Supplier'],
    data,
    linkText,
    linkHref,
    summary
}: ContributionCardProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]);
    const items = data[activeTab] || [];
    const maxValue = Math.max(...items.map(i => i.value), 1);

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
            </div>

            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className={styles.bars}>
                {items.map((item, index) => (
                    <div key={item.label} className={styles.barRow}>
                        <span className={styles.barLabel}>{item.label}</span>
                        <div className={styles.barTrack}>
                            <div
                                className={styles.barFill}
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: item.color || (index === 0 ? 'var(--color-chart-primary)' : 'var(--color-chart-secondary)'),
                                    animationDelay: `${index * 0.1}s`
                                }}
                            />
                        </div>
                        <span className={styles.barValue}>{item.value.toFixed(1)}%</span>
                    </div>
                ))}
            </div>

            {linkText && linkHref && (
                <a href={linkHref} className={styles.link}>
                    {linkText}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </a>
            )}

            {summary && <div className={styles.summary}>{summary}</div>}
        </div>
    );
}
