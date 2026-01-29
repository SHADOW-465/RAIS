'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/' },
    { label: 'Rejection Trends', href: '/trends' },
    { label: 'Defect Analysis', href: '/analysis' },
    { label: 'Supplier Quality', href: '/supplier' },
    { label: 'Reports', href: '/reports' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <span>RAIS</span>
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
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <Link href="/settings" className={styles.link}>
                    Settings
                </Link>
            </div>
        </aside>
    );
}
