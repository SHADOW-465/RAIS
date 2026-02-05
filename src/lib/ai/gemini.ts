/**
 * Gemini AI Service
 * Wrapper for Google Generative AI (Gemini) API
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import crypto from 'crypto';
import { supabaseAdmin, isConfigured } from '../db/client';
import type { AIInsight, InsightType, Sentiment } from '../db/schema.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY && typeof window === 'undefined') {
  console.warn('Missing environment variable: GEMINI_API_KEY');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Model configuration
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Use Gemini 2.0 Flash for speed and cost
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
    trend: 'improving' | 'worsening' | 'stable';
    rejectedCount: number;
    highRiskDays: Array<{ date: string; rejectionRate: number; produced: number }>;
    topDefect: { type: string; percentage: number };
  }) => `
You are an AI assistant for a manufacturing quality manager with weak eyesight who needs clear, actionable insights.

Analyze this rejection data and provide a concise executive summary (3-4 sentences maximum):

**Current Status:**
- Overall rejection rate: ${data.rejectionRate}% (${data.trend} from last period)
- Total rejected units: ${data.rejectedCount}
- High-risk days (rate > 15%): ${data.highRiskDays.length}
- Top defect: ${data.topDefect.type} (${data.topDefect.percentage}%)

**High-Risk Days (Recent):**
${data.highRiskDays.slice(0, 5).map(d => `- ${d.date}: ${d.rejectionRate}% rejection (${d.produced} produced)`).join('\n')}

**Instructions:**
1. Start with overall health assessment (improving/worsening/stable)
2. Identify the main problem area (specific dates or defect type)
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
    recentHighDefectDays: Array<{ date: string; quantity: number }>;
    stages: Array<{ stage: string; defectCount: number }>;
  }) => `
You are a manufacturing quality expert analyzing defect patterns.

Analyze this defect data and suggest probable root causes:

**Defect Type:** ${data.defectType}

**Recent Trend:**
${data.trend.slice(-5).map(t => `${t.date}: ${t.count} defects`).join('\n')}

**Peak Defect Days:**
${data.recentHighDefectDays.slice(0, 5).map(d => `- ${d.date}: ${d.quantity} defects`).join('\n')}

**Stage Breakdown:**
${data.stages.map(s => `- ${s.stage}: ${s.defectCount} defects`).join('\n')}

**Provide:**
1. **Most Likely Root Cause** (1-2 sentences)
2. **Supporting Evidence** from the data above
3. **Recommended Investigation Steps** (2-3 specific, actionable bullet points)

**Format:**
Use clear headings and bullet points. Be specific and actionable.
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
  trend: 'improving' | 'worsening' | 'stable';
  rejectedCount: number;
  highRiskDays: Array<{ date: string; rejectionRate: number; produced: number }>;
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
  recentHighDefectDays: Array<{ date: string; quantity: number }>;
  stages: Array<{ stage: string; defectCount: number }>;
}): Promise<AIInsight> {
  const prompt = PROMPTS.rootCauseAnalysis(data);
  return generateInsight('root_cause', data, prompt);
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
  if (!isConfigured) return null; // Skip cache if Supabase not configured

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

  // Return a non-persisted object if no DB configured
  if (!isConfigured) {
    return {
      id: crypto.randomUUID(),
      insight_type: type,
      context_hash: cacheKey,
      context_data: contextData,
      insight_text: text,
      sentiment,
      confidence_score: confidence,
      action_items: actionItems,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
      access_count: 0,
      last_accessed_at: null,
    } as AIInsight;
  }

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
    console.error('Failed to cache AI insight, returning un-cached result:', error.message);
    // Fallback to un-cached object if insert fails
    return {
      id: crypto.randomUUID(),
      insight_type: type,
      context_hash: cacheKey,
      context_data: contextData,
      insight_text: text,
      sentiment,
      confidence_score: confidence,
      action_items: actionItems,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
      access_count: 0,
      last_accessed_at: null,
    } as AIInsight;
  }

  return data as AIInsight;
}

/**
 * Increment access count for cached insight
 */
async function incrementInsightAccessCount(id: string): Promise<void> {
  if (!isConfigured) return; // Skip if no DB

  await supabaseAdmin
    .from('ai_insights')
    .update({
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
  const actionVerbs = ['review', 'inspect', 'check', 'investigate', 'monitor', 'contact', 'verify', 'ensure'];

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

// ============================================================================
// UPLOAD DATA ANALYSIS
// ============================================================================

export interface UploadAnalysisResult {
  fileType: 'visual' | 'assembly' | 'integrity' | 'cumulative' | 'shopfloor' | 'rejection' | 'unknown';
  summary: string;
  detectedMetrics: {
    totalRejectedColumn?: string;
    defectCountColumn?: string;
    batchNumberColumn?: string;
    dateColumn?: string;
  };
  confidence: number;
  rowCount: number;
  columnCount: number;
}

/**
 * Analyze uploaded Excel data using Gemini AI
 * Provides intelligent classification and insights
 */
export async function analyzeUploadData(
  previewData: Record<string, unknown>[],
  headers: string[],
  fileName: string
): Promise<UploadAnalysisResult> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, using fallback analysis');
    return getFallbackAnalysis(headers, previewData.length);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent results
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
      safetySettings: SAFETY_SETTINGS,
    });

    // Prepare the prompt
    const prompt = `
You are an AI assistant analyzing manufacturing quality control data from an uploaded Excel file.

**File Name:** ${fileName}
**Column Headers:** ${JSON.stringify(headers)}
**Sample Data (first ${Math.min(previewData.length, 5)} rows):**
${JSON.stringify(previewData.slice(0, 5), null, 2)}

**Your Task:**
Analyze this data and provide a structured JSON response with the following:

1. **File Type Classification**: Classify this as one of:
   - "visual" (Visual Inspection Report)
   - "assembly" (Assembly QC Report)
   - "integrity" (Integrity/Balloon Test Report)
   - "cumulative" (Cumulative/Yearly Production Summary)
   - "shopfloor" (Shopfloor/Material Incoming Report)
   - "rejection" (Rejection/Defect Report)
   - "unknown" (Cannot determine)

2. **Summary**: Write ONE human-readable sentence summarizing what this file contains (e.g., "Contains 150 Assembly records from Jan 2026 with rejection metrics in columns D and E").

3. **Detected Metrics**: Identify which columns contain:
   - Total rejected quantity (look for: reject, rejected, fail, defect, qty, quantity)
   - Defect count (look for: count, defects, issues)
   - Batch/lot number (look for: batch, lot, id, number)
   - Date (look for: date, time, day)

4. **Confidence Score**: 0-1 indicating how confident you are in this classification.

**Response Format (JSON only):**
{
  "fileType": "visual",
  "summary": "Contains 245 visual inspection records from Feb 2026 with defect tracking",
  "detectedMetrics": {
    "totalRejectedColumn": "rejected_qty",
    "defectCountColumn": "defect_count",
    "batchNumberColumn": "batch_no",
    "dateColumn": "inspection_date"
  },
  "confidence": 0.92
}

Respond with ONLY the JSON object, no markdown formatting, no explanations.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);

      return {
        fileType: parsed.fileType || 'unknown',
        summary: parsed.summary || 'Unable to generate summary',
        detectedMetrics: parsed.detectedMetrics || {},
        confidence: parsed.confidence || 0.5,
        rowCount: previewData.length,
        columnCount: headers.length,
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.log('Raw response:', text);
      return getFallbackAnalysis(headers, previewData.length);
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
    return getFallbackAnalysis(headers, previewData.length);
  }
}

/**
 * Fallback analysis when Gemini is unavailable
 */
function getFallbackAnalysis(
  headers: string[],
  rowCount: number
): UploadAnalysisResult {
  const headerStr = headers.join(' ').toLowerCase();

  // Simple keyword matching for fallback
  let fileType: UploadAnalysisResult['fileType'] = 'unknown';
  let confidence = 0.5;

  if (headerStr.includes('visual') || headerStr.includes('visu')) {
    fileType = 'visual';
    confidence = 0.7;
  } else if (headerStr.includes('assembly') || headerStr.includes('assy')) {
    fileType = 'assembly';
    confidence = 0.7;
  } else if (headerStr.includes('integrity') || headerStr.includes('balloon') || headerStr.includes('valve')) {
    fileType = 'integrity';
    confidence = 0.7;
  } else if (headerStr.includes('cumulative') || headerStr.includes('yearly') || headerStr.includes('production')) {
    fileType = 'cumulative';
    confidence = 0.7;
  } else if (headerStr.includes('shopfloor') || headerStr.includes('material') || headerStr.includes('incoming')) {
    fileType = 'shopfloor';
    confidence = 0.7;
  } else if (headerStr.includes('reject') || headerStr.includes('defect') || headerStr.includes('scrap')) {
    fileType = 'rejection';
    confidence = 0.7;
  }

  // Detect metrics from headers
  const detectedMetrics: UploadAnalysisResult['detectedMetrics'] = {};

  for (const header of headers) {
    const h = header.toLowerCase();
    if (!detectedMetrics.totalRejectedColumn && (h.includes('reject') || h.includes('fail') || h.includes('ng'))) {
      detectedMetrics.totalRejectedColumn = header;
    }
    if (!detectedMetrics.defectCountColumn && (h.includes('count') || h.includes('defect') || h.includes('qty'))) {
      detectedMetrics.defectCountColumn = header;
    }
    if (!detectedMetrics.batchNumberColumn && (h.includes('batch') || h.includes('lot') || h.includes('id'))) {
      detectedMetrics.batchNumberColumn = header;
    }
    if (!detectedMetrics.dateColumn && (h.includes('date') || h.includes('time'))) {
      detectedMetrics.dateColumn = header;
    }
  }

  return {
    fileType,
    summary: `Contains ${rowCount} ${fileType !== 'unknown' ? fileType : 'manufacturing'} records with ${headers.length} columns (${headers.slice(0, 5).join(', ')})`,
    detectedMetrics,
    confidence,
    rowCount,
    columnCount: headers.length,
  };
}
