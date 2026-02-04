import { describe, it, expect } from 'vitest';
import { transformData } from '@/lib/upload/transformer';
import type { FileType } from '@/lib/db/types';

describe('Upload Integration Flow', () => {
  const mockRows = [
    { "Prod Date": "2023-01-01", "Production Qty": "100", "Rej Qty": "5" },
    { "Prod Date": "2023-01-01", "Production Qty": "invalid", "Rej Qty": "0" } // Dirty row
  ];
  const mockHeaders = ["Prod Date", "Production Qty", "Rej Qty"];
  const fileType: FileType = 'rejection';
  const fileName = 'test_upload.xlsx';

  it('should transform "dirty" rows using Smart Mapping and generate batch numbers', async () => {
    // No mocks - testing real logic
    const result = await transformData(mockRows, mockHeaders, fileType, fileName, { skipValidation: true });

    expect(result.success).toBe(true);
    expect(result.batches.length).toBeGreaterThan(0);
    
    // Check batch number generation (date based)
    const batchNum = result.batches[0].batch_number;
    expect(batchNum).toMatch(/BATCH-20230101/);
    
    // Check data transformation
    // Note: produced_quantity might be max(100, 0) -> 100
    expect(result.batches[0].produced_quantity).toBe(100);
    // rejected_quantity should be sum(5, 0) -> 5
    expect(result.batches[0].rejected_quantity).toBe(5);
  });

  it('should handle completely unknown files gracefully', async () => {
    // A file with no recognizable headers
    const weirdRows = [{ "Foo": "Bar", "Baz": "Qux" }];
    const weirdHeaders = ["Foo", "Baz"];
    
    const result = await transformData(weirdRows, weirdHeaders, 'unknown', 'weird.xlsx', { skipValidation: true });

    // It should succeed but produce empty records or just warnings
    expect(result.success).toBe(true);
    // Should default to unknown/uuid strategy
    expect(result.aiMapping?.config.fileType).toBe('unknown');
  });
});
