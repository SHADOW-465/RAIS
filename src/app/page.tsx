import { kpiEngine } from '@/lib/analytics';
import { geminiService } from '@/lib/ai';
import HealthCard from '@/components/dashboard/HealthCard';
import KPICard from '@/components/dashboard/KPICard';
import styles from './page.module.css';
import { subDays, format } from 'date-fns';

// Default production volume (should come from production data in real implementation)
const DEFAULT_PRODUCED_VOLUME = 100000;

async function getDashboardData() {
  const to = new Date();
  const from = subDays(to, 30);
  
  try {
    // Fetch all KPIs in parallel
    const [rejectionRate, costImpact, topRisk, forecast] = await Promise.all([
      kpiEngine.calculateRejectionRate(from, to, DEFAULT_PRODUCED_VOLUME),
      kpiEngine.calculateCostImpact(from, to),
      kpiEngine.identifyTopRisk(from, to),
      kpiEngine.generateForecast(30),
    ]);
    
    // Generate AI summary
    const aiSummary = await geminiService.generateHealthSummary({
      rejectionRate,
      topRisk,
      costImpact,
    });
    
    // Determine health status
    let status: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (rejectionRate.delta > 1.0) {
      status = 'CRITICAL';
    } else if (rejectionRate.delta > 0.5) {
      status = 'WARNING';
    }
    
    return {
      health: {
        status,
        summary: aiSummary.summary,
        confidence: aiSummary.confidence,
      },
      metrics: {
        rejectionRate: {
          value: `${rejectionRate.current}%`,
          delta: `${Math.abs(rejectionRate.delta)}%`,
          direction: rejectionRate.delta > 0 ? 'up' as const : 'down' as const,
          isGood: rejectionRate.isGood,
          period: 'Last 30 days',
        },
        topRisk: {
          name: topRisk.name,
          contribution: `${topRisk.contribution}%`,
          line: topRisk.line,
        },
        costImpact: {
          value: `$${costImpact.current.toLocaleString()}`,
          projection: `Proj: $${costImpact.projection.toLocaleString()}`,
          delta: `${Math.abs(costImpact.delta)}%`,
          isGood: costImpact.delta < 0,
        },
        forecast: {
          nextMonth: `${forecast.nextMonth}`,
          ci: `${forecast.confidenceInterval[0]} - ${forecast.confidenceInterval[1]}`,
          confidence: `${forecast.confidence}%`,
        },
      },
      period: {
        from: format(from, 'MMM d'),
        to: format(to, 'MMM d, yyyy'),
      },
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    // Return fallback data on error
    return {
      health: {
        status: 'WARNING' as const,
        summary: 'Unable to load current data. Please check your connection.',
        confidence: 0,
      },
      metrics: {
        rejectionRate: {
          value: 'N/A',
          delta: '0%',
          direction: 'neutral' as const,
          isGood: true,
          period: 'Last 30 days',
        },
        topRisk: {
          name: 'Unknown',
          contribution: '0%',
          line: 'N/A',
        },
        costImpact: {
          value: '$0',
          projection: 'Proj: $0',
          delta: '0%',
          isGood: true,
        },
        forecast: {
          nextMonth: 'N/A',
          ci: 'N/A',
          confidence: '0%',
        },
      },
      period: {
        from: format(subDays(new Date(), 30), 'MMM d'),
        to: format(new Date(), 'MMM d, yyyy'),
      },
    };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  
  return (
    <div className={styles.container}>
      {/* Top Strip */}
      <HealthCard
        status={data.health.status}
        summary={data.health.summary}
        confidence={data.health.confidence}
      />

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Period: {data.period.from} - {data.period.to}
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className={styles.kpiGrid}>
        <KPICard
          title="Rejection Rate"
          value={data.metrics.rejectionRate.value}
          delta={{
            value: data.metrics.rejectionRate.delta,
            direction: data.metrics.rejectionRate.direction,
            isGood: data.metrics.rejectionRate.isGood,
          }}
          subtext={data.metrics.rejectionRate.period}
        />

        <KPICard
          title="Top Risk"
          value={data.metrics.topRisk.contribution}
          subtext={`${data.metrics.topRisk.name} - ${data.metrics.topRisk.line}`}
        >
          {/* Progress bar for risk contribution */}
          <div 
            style={{ 
              height: '4px', 
              background: '#E6E8EB', 
              borderRadius: '2px', 
              marginTop: '8px', 
              width: '100%' 
            }}
            role="progressbar"
            aria-valuenow={parseFloat(data.metrics.topRisk.contribution)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div 
              style={{ 
                height: '100%', 
                background: '#D64545', 
                width: data.metrics.topRisk.contribution, 
                borderRadius: '2px' 
              }} 
            />
          </div>
        </KPICard>

        <KPICard
          title="Cost Impact (30d)"
          value={data.metrics.costImpact.value}
          delta={{
            value: data.metrics.costImpact.delta,
            direction: data.metrics.costImpact.isGood ? 'down' : 'up',
            isGood: data.metrics.costImpact.isGood,
          }}
          subtext={data.metrics.costImpact.projection}
        />

        <KPICard
          title="Trend Forecast"
          value={data.metrics.forecast.nextMonth}
          subtext={`CI: ${data.metrics.forecast.ci}`}
        >
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
            Confidence: {data.metrics.forecast.confidence}
          </div>
          {/* Simple trend indicator */}
          <div style={{ 
            marginTop: '8px', 
            padding: '4px 8px', 
            background: 'var(--color-bg-secondary)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            display: 'inline-block'
          }}>
            Based on last 30 days
          </div>
        </KPICard>
      </div>

      {/* Quick Actions */}
      <footer className={styles.footer}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href="/settings/upload" 
            style={{ 
              padding: '14px 24px', 
              background: '#3B82F6', 
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563EB';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3B82F6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
            }}
          >
            <span>📤</span>
            Upload Data
          </a>
          <a 
            href="/trends" 
            style={{ 
              padding: '14px 24px', 
              background: 'var(--color-bg-primary)', 
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📈</span>
            View Trends
          </a>
          <a 
            href="/analysis" 
            style={{ 
              padding: '14px 24px', 
              background: 'var(--color-bg-primary)', 
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🔍</span>
            Defect Analysis
          </a>
          <a 
            href="/supplier" 
            style={{ 
              padding: '14px 24px', 
              background: 'var(--color-bg-primary)', 
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🏭</span>
            Supplier Quality
          </a>
        </div>
      </footer>
    </div>
  );
}
