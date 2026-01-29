import styles from './HealthCard.module.css';

type HealthStatus = 'GOOD' | 'WARNING' | 'CRITICAL';

interface HealthCardProps {
    status: HealthStatus;
    summary: string;
    confidence: number;
    onAssignAction?: () => void;
}

export default function HealthCard({ status, summary, confidence, onAssignAction }: HealthCardProps) {
    const statusStyle = {
        'GOOD': styles.statusGood,
        'WARNING': styles.statusWarning,
        'CRITICAL': styles.statusCritical,
    }[status];

    return (
        <div className={styles.card}>
            <div className={styles.leftSection}>
                <div className={styles.headerRow}>
                    <h2 className={styles.title}>Overall Quality Health</h2>
                    <span className={`${styles.statusPill} ${statusStyle}`}>
                        {status}
                    </span>
                </div>
                <div className={styles.summary}>
                    {summary}
                    <span className={styles.confidence}>
                        AI confidence {Math.round(confidence * 100)}%
                    </span>
                </div>
            </div>

            <button className={styles.actionButton} onClick={onAssignAction}>
                Assign Action
            </button>
        </div>
    );
}
