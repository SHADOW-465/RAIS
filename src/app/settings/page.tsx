import Link from 'next/link';
import styles from './settings.module.css';

const SETTINGS_LINKS = [
  {
    label: 'Upload Data',
    href: '/settings/upload',
    description: 'Upload Excel files with rejection data',
    icon: '📤',
    color: '#3B82F6',
  },
  {
    label: 'Database Status',
    href: '#',
    description: 'Check database connection (coming soon)',
    icon: '🗄️',
    color: '#6B7280',
    disabled: true,
  },
  {
    label: 'User Management',
    href: '#',
    description: 'Manage users and permissions (coming soon)',
    icon: '👥',
    color: '#6B7280',
    disabled: true,
  },
  {
    label: 'System Logs',
    href: '#',
    description: 'View system activity logs (coming soon)',
    icon: '📋',
    color: '#6B7280',
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>⚙️ Settings</h1>
        <p className={styles.subtitle}>Configure your RAIS dashboard</p>
      </header>

      <div className={styles.grid}>
        {SETTINGS_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`${styles.card} ${link.disabled ? styles.disabled : ''}`}
            style={{ '--card-color': link.color } as React.CSSProperties}
          >
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>{link.icon}</span>
            </div>
            <div className={styles.content}>
              <h3 className={styles.cardTitle}>{link.label}</h3>
              <p className={styles.cardDescription}>{link.description}</p>
            </div>
            {!link.disabled && (
              <div className={styles.arrow}>→</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
