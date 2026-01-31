import styles from './IssueList.module.css';

interface Issue {
    id: string;
    line: string;
    defect: string;
    delta: string;
    deltaDirection: 'up' | 'down';
    status: 'OPEN' | 'HIGH' | 'RESOLVED';
    aiConfidence?: string;
}

interface IssueListProps {
    title: string;
    issues: Issue[];
}

export default function IssueList({ title, issues }: IssueListProps) {
    const getStatusClass = (status: Issue['status']) => {
        switch (status) {
            case 'OPEN': return styles.statusOpen;
            case 'HIGH': return styles.statusHigh;
            case 'RESOLVED': return styles.statusResolved;
            default: return '';
        }
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.list}>
                {issues.map((issue) => (
                    <div key={issue.id} className={styles.issue}>
                        <div className={styles.issueMain}>
                            <div className={styles.issueHeader}>
                                <span className={styles.line}>{issue.line}</span>
                                <span className={`${styles.status} ${getStatusClass(issue.status)}`}>
                                    {issue.status}
                                </span>
                            </div>
                            <div className={styles.defect}>{issue.defect}</div>
                            <div className={styles.metrics}>
                                <span className={`${styles.delta} ${issue.deltaDirection === 'up' ? styles.deltaUp : styles.deltaDown}`}>
                                    {issue.deltaDirection === 'up' ? '▲' : '▼'} {issue.delta}
                                </span>
                                <span className={styles.subtext}>last month</span>
                                {issue.aiConfidence && (
                                    <span className={styles.aiConfidence}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        AI Confidence
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
