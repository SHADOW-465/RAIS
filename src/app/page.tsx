import { kpiEngine } from '@/lib/analytics';
import { geminiService } from '@/lib/ai';
import AttentionCard from '@/components/dashboard/AttentionCard';
import MetricCard from '@/components/dashboard/MetricCard';
import IssueList from '@/components/dashboard/IssueList';
import TrendChart from '@/components/dashboard/TrendChart';
import ContributionCard from '@/components/dashboard/ContributionCard';
import DataTable from '@/components/dashboard/DataTable';
import styles from './page.module.css';
import { subDays, format } from 'date-fns';

const DEFAULT_PRODUCED_VOLUME = 100000;

async function getDashboardData() {
  const to = new Date();
  const from = subDays(to, 30);

  try {
    const [rejectionRate, costImpact, topRisk, forecast] = await Promise.all([
      kpiEngine.calculateRejectionRate(from, to, DEFAULT_PRODUCED_VOLUME),
      kpiEngine.calculateCostImpact(from, to),
      kpiEngine.identifyTopRisk(from, to),
      kpiEngine.generateForecast(30),
    ]);

    const aiSummary = await geminiService.generateHealthSummary({
      rejectionRate,
      topRisk,
      costImpact,
    });

    // Generate trend chart data
    const trendData = [];
    for (let i = 30; i >= 0; i--) {
      const date = subDays(to, i);
      const baseValue = 2.5 + Math.random() * 1.5;
      trendData.push({
        date: format(date, 'yyyy-MM-dd'),
        value: Math.round(baseValue * 10) / 10,
      });
    }

    return {
      attention: {
        title: 'Quality Attention Required',
        description: aiSummary.summary || `Leak defects from <strong>Supplier B</strong> are driving the rejection rate up, more at <strong>${rejectionRate.current.toFixed(0)} defanges</strong>.`,
      },
      issues: [
        {
          id: '1',
          line: 'Line 3',
          defect: 'Leak Defects',
          delta: `${Math.abs(rejectionRate.delta)}%`,
          deltaDirection: rejectionRate.delta > 0 ? 'up' as const : 'down' as const,
          status: 'OPEN' as const,
          aiConfidence: 'AI Confidence',
        },
        {
          id: '2',
          line: 'Misalignment',
          defect: 'Assembly',
          delta: '28%',
          deltaDirection: 'up' as const,
          status: 'OPEN' as const,
          aiConfidence: 'AI Confidence',
        },
        {
          id: '3',
          line: 'Supplier Quality',
          defect: 'Supplier B issue detected',
          delta: `${topRisk.contribution}%`,
          deltaDirection: 'up' as const,
          status: 'HIGH' as const,
        },
      ],
      trendData,
      trendSummary: `Statistical Summary: <strong>Leak defects from Supplier B</strong> are driving the rejection rate up, now at <strong>${rejectionRate.current}%</strong>, projected to <strong>${forecast.nextMonth}%</strong> next month, potentially causing <strong>~$${(costImpact.projection / 1000000).toFixed(1)}M</strong> in losses.`,
      contribution: {
        Line: [
          { label: 'Line 3', value: 35.2, color: '#1a1f2e' },
          { label: 'Line 1', value: 23.3, color: '#2563EB' },
          { label: 'Line 2', value: 14.5, color: '#6366F1' },
        ],
        Defect: [
          { label: 'Leak', value: 31.2, color: '#DC2626' },
          { label: 'Misalign', value: 28.1, color: '#F59E0B' },
          { label: 'Crack', value: 15.4, color: '#6366F1' },
        ],
        Supplier: [
          { label: 'Supplier B', value: 42.5, color: '#DC2626' },
          { label: 'Supplier A', value: 31.2, color: '#2563EB' },
          { label: 'Supplier C', value: 18.8, color: '#1F9D55' },
        ],
      },
      metrics: {
        rejectionRate: {
          value: `${rejectionRate.current}%`,
          delta: `${Math.abs(rejectionRate.delta)}%`,
          direction: rejectionRate.delta > 0 ? 'up' as const : 'down' as const,
          isGood: rejectionRate.isGood,
          subtext: 'Last 30 month',
        },
        unitsRejected: {
          value: '11,350',
          delta: '21.7%',
          direction: 'up' as const,
          isGood: false,
          subtext: 'Last 30 days',
        },
        costActual: {
          value: '₹ 9,430,000',
          delta: '25.3%',
          direction: 'up' as const,
          isGood: false,
          subtext: 'Last 30 days last 5 ds',
          secondary: 'Projected day',
        },
        costProjected: {
          value: '₹11.1M',
          delta: '5.8%',
          direction: 'up' as const,
          isGood: false,
          subtext: 'Next month forecast: 3.8%',
          secondary: 'Projected',
        },
      },
      tableData: [
        {
          id: '1',
          line: 'Line 3',
          supplier: 'Supplier B (Leak)',
          unitsProduced: 11760,
          unitsRejected: 58788,
          rejectionRate: 24.2,
          trendDirection: 'up' as const,
          costImpact: 930,
        },
        {
          id: '2',
          line: 'Line 1',
          supplier: 'Assembly (Misalignment)',
          unitsProduced: 30000,
          unitsRejected: 52573,
          rejectionRate: 13.6,
          trendDirection: 'up' as const,
          costImpact: 930,
        },
        {
          id: '3',
          line: 'Line 1',
          supplier: 'Dav',
          unitsProduced: 32600,
          unitsRejected: 39689,
          rejectionRate: 28.2,
          trendDirection: 'up' as const,
          costImpact: 930,
        },
      ],
      period: {
        from: format(from, 'MMM d'),
        to: format(to, 'MMM d, yyyy'),
      },
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    // Return fallback data
    return {
      attention: {
        title: 'Quality Attention Required',
        description: 'Unable to load current data. Please check your connection.',
      },
      issues: [],
      trendData: [],
      trendSummary: '',
      contribution: { Line: [], Defect: [], Supplier: [] },
      metrics: {
        rejectionRate: { value: 'N/A', delta: '0%', direction: 'neutral' as const, isGood: true, subtext: 'Last 30 days' },
        unitsRejected: { value: 'N/A', delta: '0%', direction: 'neutral' as const, isGood: true, subtext: 'Last 30 days' },
        costActual: { value: 'N/A', delta: '0%', direction: 'neutral' as const, isGood: true, subtext: 'Last 30 days' },
        costProjected: { value: 'N/A', delta: '0%', direction: 'neutral' as const, isGood: true, subtext: 'Forecast' },
      },
      tableData: [],
      period: { from: '', to: '' },
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className={styles.container}>
      {/* Quality Attention Required */}
      <AttentionCard
        title={data.attention.title}
        description={data.attention.description}
      />

      {/* Main 3-Column Grid */}
      <div className={styles.mainGrid}>
        {/* Left: Issue List */}
        <IssueList title="Rejection Rate Trend" issues={data.issues} />

        {/* Center: Trend Chart */}
        <TrendChart
          title="Rejection Rate Trend"
          data={data.trendData}
          dateRange="Last 30 days"
          summary={data.trendSummary}
          linkText="View Rejection Trends"
          linkHref="/trends"
        />

        {/* Right: Contribution Card */}
        <ContributionCard
          title="Rejection Contribution"
          tabs={['Line', 'Defect', 'Supplier']}
          data={data.contribution}
          linkText="View Defect Analysis"
          linkHref="/analysis"
          summary="Last 30 Summary Dec, My = 225"
        />
      </div>

      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Batch / Line Rejection Overview</h2>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <MetricCard
          value={data.metrics.rejectionRate.value}
          delta={{
            value: data.metrics.rejectionRate.delta,
            direction: data.metrics.rejectionRate.direction,
            isGood: data.metrics.rejectionRate.isGood,
          }}
          subtext={data.metrics.rejectionRate.subtext}
        />
        <MetricCard
          value={data.metrics.unitsRejected.value}
          delta={{
            value: data.metrics.unitsRejected.delta,
            direction: data.metrics.unitsRejected.direction,
            isGood: data.metrics.unitsRejected.isGood,
          }}
          subtext={data.metrics.unitsRejected.subtext}
        />
        <MetricCard
          value={data.metrics.costActual.value}
          delta={{
            value: data.metrics.costActual.delta,
            direction: data.metrics.costActual.direction,
            isGood: data.metrics.costActual.isGood,
          }}
          subtext={data.metrics.costActual.subtext}
          secondary={data.metrics.costActual.secondary}
        />
        <MetricCard
          value={data.metrics.costProjected.value}
          delta={{
            value: data.metrics.costProjected.delta,
            direction: data.metrics.costProjected.direction,
            isGood: data.metrics.costProjected.isGood,
          }}
          subtext={data.metrics.costProjected.subtext}
          secondary={data.metrics.costProjected.secondary}
        />
      </div>

      {/* Data Table */}
      <DataTable title="Batch / Line / Supplier" rows={data.tableData} />
    </div>
  );
}
