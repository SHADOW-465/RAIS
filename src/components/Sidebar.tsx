'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/', icon: '📊' },
    { label: 'Rejection Trends', href: '/trends', icon: '📈' },
    { label: 'Defect Analysis', href: '/analysis', icon: '🔍' },
    { label: 'Supplier Quality', href: '/supplier', icon: '🏭' },
    { label: 'Reports', href: '/reports', icon: '📄' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <span className={styles.logoIcon}>📊</span>
                <span className={styles.logoText}>RAIS</span>
            </div>

            {/* Quick Upload Link */}
            <div className={styles.quickSection}>
                <Link 
                    href="/settings/upload" 
                    className={styles.uploadLink}
                >
                    <span className={styles.uploadIcon}>📤</span>
                    <span className={styles.uploadText}>Upload Data</span>
                </Link>
            </div>

            <nav className={styles.nav}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.link} ${isActive ? styles.active : ''}`}
                        >
                            <span className={styles.linkIcon}>{item.icon}</span>
                            <span className={styles.linkText}>{item.label}</span>
                            {isActive && <span className={styles.activeIndicator} />}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <Link 
                    href="/settings" 
                    className={`${styles.link} ${pathname?.startsWith('/settings') ? styles.active : ''}`}
                >
                    <span className={styles.linkIcon}>⚙️</span>
                    <span className={styles.linkText}>Settings</span>
                </Link>
            </div>
        </aside>
    );
}
