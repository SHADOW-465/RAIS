'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';

const NAV_TABS = [
    { label: 'Overview', href: '/' },
    { label: 'Resources', href: '/reports' },
    { label: 'Defect Analysis', href: '/analysis' },
    { label: 'Analytics', href: '/trends' },
];

export default function TopNav() {
    const pathname = usePathname();

    return (
        <header className={styles.header}>
            <nav className={styles.tabs}>
                {NAV_TABS.map((tab) => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`${styles.tab} ${isActive ? styles.active : ''}`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.controls}>
                {/* Factory Selector */}
                <div className={styles.factorySelector}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <select className={styles.select} defaultValue="factory-a">
                        <option value="factory-a">Factory A</option>
                        <option value="factory-b">Factory B</option>
                        <option value="factory-c">Factory C</option>
                    </select>
                </div>

                {/* Stats Badge */}
                <div className={styles.statBadge}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    <span>350</span>
                </div>

                {/* Notifications */}
                <button className={styles.iconButton} aria-label="Notifications">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className={styles.notificationDot}></span>
                </button>

                {/* User Avatar */}
                <div className={styles.userAvatar}>
                    <span>MT</span>
                </div>
            </div>
        </header>
    );
}
