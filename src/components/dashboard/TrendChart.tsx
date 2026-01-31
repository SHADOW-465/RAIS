'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import styles from './TrendChart.module.css';

interface DataPoint {
    date: string;
    value: number;
    forecast?: number;
}

interface TrendChartProps {
    title: string;
    data: DataPoint[];
    dateRange?: string;
    summary?: string;
    linkText?: string;
    linkHref?: string;
    height?: number;
}

export default function TrendChart({
    title,
    data,
    dateRange = 'Last 30 days',
    summary,
    linkText,
    linkHref,
    height = 200
}: TrendChartProps) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatValue = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    // Find the latest data point for the label
    const latestPoint = data[data.length - 1];

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                <select className={styles.dateSelect} defaultValue={dateRange}>
                    <option value="Last 7 days">Last 7 days</option>
                    <option value="Last 30 days">Last 30 days</option>
                    <option value="Last 90 days">Last 90 days</option>
                    <option value="This Year">This Year</option>
                </select>
            </div>

            <div className={styles.chartWrapper} style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1F9D55" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#1F9D55" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E6E8EB"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            axisLine={{ stroke: '#E6E8EB' }}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `${v}%`}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E6E8EB',
                                borderRadius: '8px',
                                fontSize: '13px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                            }}
                            formatter={(value) => [formatValue(Number(value) || 0), 'Rate']}
                            labelFormatter={(label) => formatDate(String(label))}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#1F9D55"
                            strokeWidth={2.5}
                            fill="url(#colorValue)"
                            dot={false}
                            activeDot={{ r: 6, stroke: '#1F9D55', strokeWidth: 2, fill: '#fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Latest value label */}
                {latestPoint && (
                    <div className={styles.latestLabel}>
                        <span className={styles.latestValue}>{latestPoint.value.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {summary && (
                <div className={styles.summary}>
                    <div className={styles.summaryIcon}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </div>
                    <p className={styles.summaryText}>{summary}</p>
                </div>
            )}

            {linkText && linkHref && (
                <a href={linkHref} className={styles.link}>
                    {linkText}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </a>
            )}
        </div>
    );
}
