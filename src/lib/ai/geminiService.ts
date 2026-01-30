import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/lib/config';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  response: string;
  confidence: number;
  timestamp: number;
}

export interface HealthSummaryData {
  rejectionRate: {
    current: number;
    previous: number;
    delta: number;
  };
  topRisk: {
    name: string;
    contribution: number;
    line: string;
  };
  costImpact: {
    current: number;
    projection: number;
  };
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private cache: Map<string, CacheEntry>;
  private model: any;

  constructor() {
    this.client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.cache = new Map();
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.1,
        maxOutputTokens: 200,
      },
    });
  }

  async generateHealthSummary(data: HealthSummaryData): Promise<{
    summary: string;
    confidence: number;
  }> {
    const cacheKey = this.generateCacheKey('health', data);
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { summary: cached.response, confidence: cached.confidence };
    }

    const prompt = this.buildHealthPrompt(data);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim();

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(response, data);

      this.setCache(cacheKey, {
        response,
        confidence,
        timestamp: Date.now(),
      });

      return { summary: response, confidence };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to template
      return this.fallbackHealthSummary(data);
    }
  }

  private buildHealthPrompt(data: HealthSummaryData): string {
    const trend = data.rejectionRate.delta > 0 ? 'increasing' : 'decreasing';
    const severity =
      data.rejectionRate.delta > 1
        ? 'significantly'
        : data.rejectionRate.delta > 0.5
          ? 'moderately'
          : 'slightly';

    return `You are a manufacturing quality assistant. Generate a 1-2 sentence summary for a General Manager based on this data:

Current Rejection Rate: ${data.rejectionRate.current}% (was ${data.rejectionRate.previous}%)
Change: ${data.rejectionRate.delta > 0 ? '+' : ''}${data.rejectionRate.delta}% (${trend} ${severity})
Top Defect: ${data.topRisk.name} (${data.topRisk.contribution}% of rejections)
Primary Line: ${data.topRisk.line}
Monthly Cost Impact: $${data.costImpact.current.toLocaleString()}

Rules:
- Use plain, simple language suitable for an executive
- Mention if the trend is concerning (rejection rate increasing by more than 0.5%)
- Include specific numbers
- Suggest one action if appropriate
- Maximum 2 sentences
- Be factual and do not make up data

Summary:`;
  }

  private fallbackHealthSummary(data: HealthSummaryData): {
    summary: string;
    confidence: number;
  } {
    const trend = data.rejectionRate.delta > 0 ? 'increasing' : 'decreasing';
    return {
      summary: `Rejection rate is ${data.rejectionRate.current}% and ${trend}. Top issue is ${data.topRisk.name} on ${data.topRisk.line}.`,
      confidence: 0.5,
    };
  }

  private generateCacheKey(type: string, data: unknown): string {
    const dataStr = JSON.stringify(data);
    return `${type}:${Buffer.from(dataStr).toString('base64').substring(0, 32)}`;
  }

  private getCached(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  private setCache(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
  }

  private calculateConfidence(response: string, data: HealthSummaryData): number {
    // Simple heuristic: check if response contains key numbers
    const hasRate = response.includes(String(data.rejectionRate.current));
    const hasDefect = response.toLowerCase().includes(data.topRisk.name.toLowerCase());
    const isShort = response.split('.').length <= 3;

    let confidence = 0.7;
    if (hasRate) confidence += 0.1;
    if (hasDefect) confidence += 0.1;
    if (isShort) confidence += 0.1;

    return Math.min(1, confidence);
  }
}

export const geminiService = new GeminiService();
