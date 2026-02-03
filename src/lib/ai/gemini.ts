/**
 * Gemini AI Service
 * Wrapper for Google Generative AI (Gemini) API
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import crypto from 'crypto';
import { supabaseAdmin } from '../db/client';
import type { AIInsight, InsightType, Sentiment } from '../db/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY && typeof window === 'undefined') {
  console.warn('Missing environment variable: GEMINI_API_KEY');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Model configuration
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Use Gemini 2.5 Flash for speed and cost
const GENERATION_CONFIG = {
  temperature: 0.7, // Balanced creativity
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024,
};

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Cache TTL (1 hour)
const CACHE_TTL_HOURS = 1;

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const PROMPTS = {
  healthSummary: (data: {
    rejectionRate: number;
    trend: 'up' | 'down' | 'stable';
    rejectedCount: number;
    highRiskBatches: Array<{ batchNumber: string; rejectionRate: number }>;
    topDefect: { type: string; percentage: number };
  }) => `
You are an AI assistant for a manufacturing quality manager with weak eyesight who needs clear, actionable insights.

Analyze this rejection data and provide a concise executive summary (3-4 sentences maximum):

**Current Status:**
- Overall rejection rate: ${data.rejectionRate}% (${data.trend} from last period)
- Total rejected units: ${data.rejectedCount}
- High-risk batches: ${data.highRiskBatches.length}
- Top defect: ${data.topDefect.type} (${data.topDefect.percentage}%)

**High-Risk Batches:**
${data.highRiskBatches.map(b => `- ${b.batchNumber}: ${b.rejectionRate}% rejection`).join('\n')}

**Instructions:**
1. Start with overall health assessment (improving/worsening/stable)
2. Identify the main problem area
3. List urgent action items if any (use ⚠️ emoji for urgent items)
4. Use simple, non-technical language
5. Be direct and actionable

**Format:**
- Use bullet points with emojis for visual clarity
- Keep sentences short (max 15 words each)
- Focus on "what to do" not "what happened"
`,

  rootCauseAnalysis: (data: {
    defectType: string;
    trend: Array<{ date: string; count: number }>;
    affectedBatches: Array<{ batchNumber: string; quantity: number }>;
    suppliers: Array<{ name: string; defectRate: number }>;
    stages: Array<{ stage: string; defectCount: number }>;
  }) => `
You are a manufacturing quality expert analyzing defect patterns.

Analyze this defect data and suggest probable root causes:

**Defect Type:** ${data.defectType}

**Recent Trend:**
${data.trend.map(t => `${t.date}: ${t.count} defects`).join('\n')}

**Affected Batches (Top 5):**
${data.affectedBatches.slice(0, 5).map(b => `- ${b.batchNumber}: ${b.quantity} defects`).join('\n')}

**Supplier Correlation:**
${data.suppliers.map(s => `- ${s.name}: ${s.defectRate}% defect rate`).join('\n')}

**Stage Breakdown:**
${data.stages.map(s => `- ${s.stage}: ${s.defectCount} defects`).join('\n')}

**Provide:**
1. **Most Likely Root Cause** (1-2 sentences)
2. **Supporting Evidence** from the data above
3. **Recommended Investigation Steps** (2-3 specific, actionable bullet points)

**Format:**
Use clear headings and bullet points. Be specific and actionable.
`,

  predictiveForecast: (data: {
    batchNumber: string;
    currentRejectionRate: number;
    inspectionHistory: Array<{ stage: string; failureRate: number }>;
    similarBatches: Array<{ batchNumber: string; finalRejectionRate: number }>;
  }) => `
You are a predictive analytics assistant for manufacturing quality control.

Predict the final risk level for this batch based on inspection history:

**Batch:** ${data.batchNumber}
**Current Rejection Rate:** ${data.currentRejectionRate}%

**Inspection History:**
${data.inspectionHistory.map(i => `- ${i.stage}: ${i.failureRate}% failure rate`).join('\n')}

**Historical Comparison (similar batches):**
${data.similarBatches.map(b => `- ${b.batchNumber}: ended at ${b.finalRejectionRate}%`).join('\n')}

**Risk Thresholds:**
- Normal: < 8%
- Watch: 8-15%
- High Risk: > 15%

**Predict:**
1. **Final Risk Level:** Normal / Watch / High Risk
2. **Confidence Level:** 0-100%
3. **Reasoning:** Why this prediction (2-3 sentences)
4. **Recommended Actions:** What to do now (2-3 bullet points)

Use historical patterns to make your prediction. Be specific about confidence level.
`,

  anomalyDetection: (data: {
    metric: string;
    currentValue: number;
    historicalAverage: number;
    standardDeviation: number;
    recentValues: number[];
  }) => `
You are an anomaly detection assistant for manufacturing quality monitoring.

Analyze if this metric shows an anomaly:

**Metric:** ${data.metric}
**Current Value:** ${data.currentValue}
**Historical Average:** ${data.historicalAverage}
**Standard Deviation:** ${data.standardDeviation}
**Recent Values:** ${data.recentValues.join(', ')}

**Determine:**
1. **Is this an anomaly?** Yes / No
2. **Severity:** Minor / Moderate / Critical
3. **Explanation:** Why is this unusual? (1-2 sentences)
4. **Possible Causes:** What could cause this? (2-3 bullet points)
5. **Recommended Actions:** What should be done? (2-3 bullet points)

Be conservative with anomaly detection - only flag genuine outliers.
`,
} as const;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate AI insight with caching
 */
export async function generateInsight(
  type: InsightType,
  contextData: Record<string, unknown>,
  prompt: string
): Promise<AIInsight> {
  // Check cache first
  const cachedInsight = await getCachedInsight(type, contextData);
  if (cachedInsight) {
    // Update access count
    await incrementInsightAccessCount(cachedInsight.id);
    return cachedInsight;
  }

  // Generate new insight
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Extract sentiment and action items
  const sentiment = extractSentiment(text);
  const actionItems = extractActionItems(text);

  // Calculate confidence (simple heuristic based on response length and keywords)
  const confidence = calculateConfidence(text);

  // Save to cache
  const insight = await cacheInsight(type, contextData, text, sentiment, confidence, actionItems);

  return insight;
}

/**
 * Generate health summary for dashboard
 */
export async function generateHealthSummary(data: {
  rejectionRate: number;
  trend: 'up' | 'down' | 'stable';
  rejectedCount: number;
  highRiskBatches: Array<{ batchNumber: string; rejectionRate: number }>;
  topDefect: { type: string; percentage: number };
}): Promise<AIInsight> {
  const prompt = PROMPTS.healthSummary(data);
  return generateInsight('health_summary', data, prompt);
}

/**
 * Generate root cause analysis for defects
 */
export async function generateRootCauseAnalysis(data: {
  defectType: string;
  trend: Array<{ date: string; count: number }>;
  affectedBatches: Array<{ batchNumber: string; quantity: number }>;
  suppliers: Array<{ name: string; defectRate: number }>;
  stages: Array<{ stage: string; defectCount: number }>;
}): Promise<AIInsight> {
  const prompt = PROMPTS.rootCauseAnalysis(data);
  return generateInsight('root_cause', data, prompt);
}

/**
 * Generate predictive forecast for batch
 */
export async function generatePredictiveForecast(data: {
  batchNumber: string;
  currentRejectionRate: number;
  inspectionHistory: Array<{ stage: string; failureRate: number }>;
  similarBatches: Array<{ batchNumber: string; finalRejectionRate: number }>;
}): Promise<AIInsight> {
  const prompt = PROMPTS.predictiveForecast(data);
  return generateInsight('prediction', data, prompt);
}

/**
 * Detect anomalies in metrics
 */
export async function detectAnomaly(data: {
  metric: string;
  currentValue: number;
  historicalAverage: number;
  standardDeviation: number;
  recentValues: number[];
}): Promise<AIInsight> {
  const prompt = PROMPTS.anomalyDetection(data);
  return generateInsight('anomaly', data, prompt);
}

// ============================================================================
// CACHING FUNCTIONS
// ============================================================================

/**
 * Generate cache key from context data
 */
function generateCacheKey(type: InsightType, contextData: Record<string, unknown>): string {
  const dataString = JSON.stringify({ type, ...contextData });
  return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * Get cached insight if not expired
 */
async function getCachedInsight(
  type: InsightType,
  contextData: Record<string, unknown>
): Promise<AIInsight | null> {
  const cacheKey = generateCacheKey(type, contextData);

  const { data, error } = await supabaseAdmin
    .from('ai_insights')
    .select('*')
    .eq('context_hash', cacheKey)
    .eq('insight_type', type)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data as AIInsight;
}

/**
 * Cache AI insight
 */
async function cacheInsight(
  type: InsightType,
  contextData: Record<string, unknown>,
  text: string,
  sentiment: Sentiment,
  confidence: number,
  actionItems: string[]
): Promise<AIInsight> {
  const cacheKey = generateCacheKey(type, contextData);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  const { data, error } = await supabaseAdmin
    .from('ai_insights')
    .insert({
      insight_type: type,
      context_hash: cacheKey,
      context_data: contextData,
      insight_text: text,
      sentiment,
      confidence_score: confidence,
      action_items: actionItems,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cache AI insight: ${error.message}`);
  }

  return data as AIInsight;
}

/**
 * Increment access count for cached insight
 */
async function incrementInsightAccessCount(id: string): Promise<void> {
  await supabaseAdmin
    .from('ai_insights')
    .update({
      access_count: supabaseAdmin.rpc('increment', { row_id: id }),
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', id);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract sentiment from AI response
 */
function extractSentiment(text: string): Sentiment {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes('critical') ||
    lowerText.includes('urgent') ||
    lowerText.includes('severe') ||
    lowerText.includes('⚠️')
  ) {
    return 'critical';
  }

  if (
    lowerText.includes('concern') ||
    lowerText.includes('worrying') ||
    lowerText.includes('deteriorat')
  ) {
    return 'concerning';
  }

  if (
    lowerText.includes('improv') ||
    lowerText.includes('better') ||
    lowerText.includes('good')
  ) {
    return 'positive';
  }

  return 'neutral';
}

/**
 * Extract action items from AI response
 */
function extractActionItems(text: string): string[] {
  const actionItems: string[] = [];

  // Look for bullet points with action verbs
  const lines = text.split('\n');
  const actionVerbs = ['review', 'inspect', 'check', 'investigate', 'monitor', 'contact', 'verify'];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\./)) &&
      actionVerbs.some(verb => trimmed.toLowerCase().includes(verb))
    ) {
      actionItems.push(trimmed.replace(/^[-•\d.]\s*/, ''));
    }
  }

  return actionItems.slice(0, 5); // Max 5 action items
}

/**
 * Calculate confidence score based on response characteristics
 */
function calculateConfidence(text: string): number {
  let confidence = 0.5; // Base confidence

  // Longer responses with specific details get higher confidence
  if (text.length > 200) confidence += 0.1;
  if (text.length > 400) confidence += 0.1;

  // Presence of specific keywords increases confidence
  const highConfidenceKeywords = ['clearly', 'definitely', 'evident', 'strong correlation'];
  const lowConfidenceKeywords = ['possibly', 'might', 'unclear', 'insufficient data'];

  for (const keyword of highConfidenceKeywords) {
    if (text.toLowerCase().includes(keyword)) confidence += 0.05;
  }

  for (const keyword of lowConfidenceKeywords) {
    if (text.toLowerCase().includes(keyword)) confidence -= 0.1;
  }

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Test Gemini API connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent('Hello');
    return !!result.response.text();
  } catch (error) {
    console.error('Gemini API test failed:', error);
    return false;
  }
}
