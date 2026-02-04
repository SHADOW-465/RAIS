/**
 * Example React Component: AIInsightPanel
 * Display AI-generated insights with sentiment indicators
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AIInsight, Sentiment } from '@/lib/db/schema.types';

export interface AIInsightPanelProps {
  insightType: string;
  fetchInsight: () => Promise<AIInsight>;
  refreshInterval?: number; // Auto-refresh in milliseconds
}

export function AIInsightPanel({
  insightType,
  fetchInsight,
  refreshInterval,
}: AIInsightPanelProps) {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsight = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInsight();
      setInsight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI insight');
    } finally {
      setLoading(false);
    }
  }, [fetchInsight]);

  useEffect(() => {
    loadInsight();

    // Setup auto-refresh if specified
    if (refreshInterval) {
      const interval = setInterval(loadInsight, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadInsight]);

  const sentimentConfig: Record<Sentiment, { color: string; icon: string; label: string }> = {
    positive: {
      color: 'border-success bg-success/10',
      icon: '✅',
      label: 'Positive',
    },
    neutral: {
      color: 'border-info bg-info/10',
      icon: 'ℹ️',
      label: 'Neutral',
    },
    concerning: {
      color: 'border-warning bg-warning/10',
      icon: '⚠️',
      label: 'Concerning',
    },
    critical: {
      color: 'border-danger bg-danger/10',
      icon: '🚨',
      label: 'Critical',
    },
  };

  if (loading) {
    return (
      <div
        className="card border-l-4 border-primary"
        role="region"
        aria-label="AI Insight loading"
        aria-busy="true"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-spin text-2xl">🤖</div>
          <h3 className="text-xl font-semibold">AI {insightType}</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card border-l-4 border-danger bg-danger/5"
        role="alert"
        aria-label="AI Insight error"
      >
        <h3 className="text-xl font-semibold text-danger mb-2">
          ⚠️ AI Insight Error
        </h3>
        <p className="text-base text-text-secondary">{error}</p>
        <button
          onClick={loadInsight}
          className="btn btn-secondary mt-4"
          aria-label="Retry loading AI insight"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  const sentiment = insight.sentiment || 'neutral';
  const sentimentStyle = sentimentConfig[sentiment];

  return (
    <div
      className={`card border-l-4 ${sentimentStyle.color}`}
      role="region"
      aria-label={`AI ${insightType} - ${sentimentStyle.label} sentiment`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🤖</span>
          <h3 className="text-xl font-semibold">AI {insightType}</h3>
        </div>
        <span
          className="text-sm px-3 py-1 rounded-full bg-white border border-gray-300"
          role="status"
          aria-label={`Sentiment: ${sentimentStyle.label}`}
        >
          {sentimentStyle.icon} {sentimentStyle.label}
        </span>
      </div>

      {/* Insight Text */}
      <div className="prose prose-lg max-w-none mb-4">
        <p className="text-base leading-relaxed whitespace-pre-line">
          {insight.insight_text}
        </p>
      </div>

      {/* Action Items */}
      {insight.action_items && insight.action_items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-lg font-semibold mb-2">Recommended Actions</h4>
          <ul className="space-y-2" role="list">
            {insight.action_items.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-base"
              >
                <span className="text-primary mt-1" aria-hidden="true">▶</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence Score */}
      {insight.confidence_score !== null && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Confidence</span>
            <span className="text-base font-medium">
              {Math.round((insight.confidence_score || 0) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(insight.confidence_score || 0) * 100}%` }}
              role="progressbar"
              aria-valuenow={(insight.confidence_score || 0) * 100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confidence: ${Math.round((insight.confidence_score || 0) * 100)}%`}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-text-tertiary">
        <span>
          Generated {new Date(insight.generated_at).toLocaleString()}
        </span>
        <button
          onClick={loadInsight}
          className="text-primary hover:text-primary-dark font-medium"
          aria-label="Refresh AI insight"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

/**
 * Example Usage:
 * 
 * <AIInsightPanel
 *   insightType="Health Summary"
 *   fetchInsight={async () => {
 *     const response = await fetch('/api/ai/summarize');
 *     const data = await response.json();
 *     return data.data;
 *   }}
 *   refreshInterval={60000} // Refresh every minute
 * />
 */
