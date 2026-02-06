import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataTransformationConfig } from '@/lib/ai/dataMapper';

// Hoist the mock function so it can be referenced inside the mock factory
const { mockGenerateContent } = vi.hoisted(() => {
  return { mockGenerateContent: vi.fn() };
});

// Mock Gemini AI
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
    HarmCategory: {},
    HarmBlockThreshold: {},
  };
});

describe('Data Mapper (AI Mocked)', () => {
  let generateColumnMapping: typeof import('@/lib/ai/dataMapper').generateColumnMapping;
  let applyMapping: typeof import('@/lib/ai/dataMapper').applyMapping;
  let BATCH_SCHEMA: typeof import('@/lib/ai/dataMapper').BATCH_SCHEMA;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('GEMINI_API_KEY', 'mock-key');

    const mod = await import('@/lib/ai/dataMapper');
    generateColumnMapping = mod.generateColumnMapping;
    applyMapping = mod.applyMapping;
    BATCH_SCHEMA = mod.BATCH_SCHEMA;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateColumnMapping', () => {
    it('should parse valid JSON response from Gemini', async () => {
      const mockResponse = {
        mapping: {
          "Qty": "produced_quantity",
          "Rej": "rejected_quantity",
          "Date": "production_date"
        },
        batchGeneration: { type: "date_based", format: "BATCH-YYYYMMDD" },
        confidence: 0.95,
        explanation: "Mapped columns based on similarity"
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockResponse)
        }
      });

      const rows = [{ "Qty": 100, "Rej": 5, "Date": "2023-01-01" }];
      const headers = ["Qty", "Rej", "Date"];

      const result = await generateColumnMapping(rows, headers, BATCH_SCHEMA, 'rejection', 'test.xlsx');

      expect(result.success).toBe(true);
      expect(result.config.mapping).toEqual(mockResponse.mapping);
      expect(result.confidence).toBe(0.95);
    });

    it('should handle AI response errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const rows = [{ "Qty": 100 }];
      const headers = ["Qty"];

      const result = await generateColumnMapping(rows, headers, BATCH_SCHEMA, 'rejection', 'test.xlsx');

      // It should fall back to heuristic mapping
      expect(result.success).toBe(true);
      expect(result.confidence).toBeLessThan(0.9); // Fallback has lower confidence
    });
  });

  describe('applyMapping', () => {
    it('should transform rows based on mapping config', () => {
      const rows = [
        { "Qty": "100", "Rej": 5, "Date": "2023-01-01" }
      ];

      const config: DataTransformationConfig = {
        mapping: {
          "Qty": "produced_quantity",
          "Rej": "rejected_quantity",
          "Date": "production_date"
        },
        batchGeneration: { type: "uuid" },
        typeConversions: {
          produced_quantity: 'number',
          rejected_quantity: 'number',
          production_date: 'date'
        },
        defaultValues: {}
      };

      const result = applyMapping(rows, config, 'rejection');

      expect(result.batches).toHaveLength(1);
      // For 'rejection' type, produced_quantity comes from row (100)
      expect(result.batches[0].produced_quantity).toBe(100);
      // rejected_quantity comes from aggregation (5)
      expect(result.batches[0].rejected_quantity).toBe(5);
      expect(result.batches[0].batch_number).toBeDefined();
    });

    it('should auto-generate batch number from date', () => {
      const rows = [
        { "Date": "2023-10-25" }
      ];

      const config: DataTransformationConfig = {
        mapping: {
          "Date": "production_date"
        },
        batchGeneration: {
          type: "date_based",
          format: "BATCH-YYYYMMDD",
          sourceColumns: ["Date"]
        },
        typeConversions: {
          production_date: 'date'
        },
        defaultValues: {}
      };

      const result = applyMapping(rows, config, 'rejection');

      expect(result.batches[0].batch_number).toBe('BATCH-20231025');
    });
  });
});
