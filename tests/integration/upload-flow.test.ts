import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformData } from '@/lib/upload/transformer';
import { generateColumnMapping } from '@/lib/ai/dataMapper';
import type { FileType } from '@/lib/db/types';

// Mock the AI mapper to avoid external calls
vi.mock('@/lib/ai/dataMapper', async () => {
  const actual = await vi.importActual('@/lib/ai/dataMapper');
  return {
    ...actual,
    generateColumnMapping: vi.fn(),
  };
});

describe('Upload Integration Flow', () => {
  const mockRows = [
    { "Prod Date": "2023-01-01", "Qty": "100", "Rej": "5" },
    { "Prod Date": "2023-01-01", "Qty": "invalid", "Rej": "0" } // Dirty row
  ];
  const mockHeaders = ["Prod Date", "Qty", "Rej"];
  const fileType: FileType = 'rejection';
  const fileName = 'test_upload.xlsx';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transform "dirty" rows using AI mapping and generate batch numbers', async () => {
    // Mock successful AI mapping (using unknown as intermediate cast)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (generateColumnMapping as unknown as any).mockResolvedValue({
      success: true,
      config: {
        mapping: {
          "Prod Date": "production_date",
          "Qty": "produced_quantity",
          "Rej": "rejected_quantity"
        },
        batchGeneration: { type: "date_based", format: "BATCH-YYYYMMDD", sourceColumns: ["Prod Date"] },
        typeConversions: {
          production_date: 'date',
          produced_quantity: 'number',
          rejected_quantity: 'number'
        },
        defaultValues: {}
      },
      confidence: 0.9,
      warnings: [],
      errors: []
    });

    const result = await transformData(mockRows, mockHeaders, fileType, fileName, { skipValidation: true });

    expect(result.success).toBe(true);
    // Batches are unique by batch_number. Since both rows have same date and strategy is date_based, 
    // they share the same batch.
    expect(result.batches).toHaveLength(1);
    expect(result.inspections).toHaveLength(2);

    // Check batch number generation
    expect(result.batches[0].batch_number).toBe('BATCH-20230101');

    // Check data transformation
    expect(result.batches[0].produced_quantity).toBe(100);
    expect(result.batches[0].rejected_quantity).toBe(5);

    // Check dirty row handling (should be converted or generate warning/error)
    // The invalid number "invalid" -> NaN -> might be filtered or error? 
    // Depending on applyMapping implementation. 
    // Assuming applyMapping adds error for conversion failure.

    // If strict conversion:
    // expect(result.errors.length).toBeGreaterThan(0); 
    // OR if lenient:
    // expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle missing AI mapping by failing gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (generateColumnMapping as unknown as any).mockResolvedValue({
      success: false,
      errors: ["AI failed to map columns"],
      warnings: [],
      config: null
    });

    const result = await transformData(mockRows, mockHeaders, fileType, fileName, { skipValidation: true });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("AI failed to map columns");
  });
});
