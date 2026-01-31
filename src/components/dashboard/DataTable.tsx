import styles from './DataTable.module.css';

interface TableRow {
    id: string;
    line: string;
    supplier: string;
    unitsProduced: number;
    unitsRejected: number;
    rejectionRate: number;
    trendDirection: 'up' | 'down' | 'stable';
    costImpact: number;
}

interface DataTableProps {
    title: string;
    rows: TableRow[];
}

export default function DataTable({ title, rows }: DataTableProps) {
    const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
        if (direction === 'up') {
            return <span className={styles.trendUp}>▲</span>;
        }
        if (direction === 'down') {
            return <span className={styles.trendDown}>▼</span>;
        }
        return <span className={styles.trendStable}>→</span>;
    };

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Batch / Line / Supplier</th>
                            <th className={styles.alignRight}>Units Produced</th>
                            <th className={styles.alignRight}>Units Rejected</th>
                            <th className={styles.alignRight}>Line/Racing Rate</th>
                            <th className={styles.alignRight}>Cost Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>
                                    <div className={styles.cellPrimary}>{row.line}</div>
                                    <div className={styles.cellSecondary}>{row.supplier}</div>
                                </td>
                                <td className={styles.alignRight}>{row.unitsProduced.toLocaleString()}</td>
                                <td className={styles.alignRight}>
                                    <span className={styles.rejectedValue}>{row.unitsRejected.toLocaleString()}</span>
                                    <span className={`${styles.rejectionRate} ${row.rejectionRate > 20 ? styles.rateHigh : ''}`}>
                                        {row.rejectionRate.toFixed(1)}%
                                    </span>
                                </td>
                                <td className={styles.alignRight}>
                                    {getTrendIcon(row.trendDirection)}
                                    <span className={styles.rateValue}>{row.rejectionRate.toFixed(1)}%</span>
                                </td>
                                <td className={styles.alignRight}>
                                    <span className={styles.costValue}>₹ {row.costImpact.toLocaleString()}</span>
                                    <span className={styles.statusDot}></span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
