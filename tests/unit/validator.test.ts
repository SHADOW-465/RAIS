import { describe, it, expect } from 'vitest';
import { validateData } from '@/lib/upload/validator';
import type { FileType } from '@/lib/db/types';

describe('Validator (Relaxed Rules for AI Recovery)', () => {
  it('should return warning (not error) for missing batch_number', async () => {
    const rows = [
      {
        // batch_number missing
        rejected_quantity: 10,
      }
    ];
    const fileType: FileType = 'rejection';
    
    const result = await validateData(rows, fileType);
    
    // Should be valid because errors.length === 0
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    
    const batchWarning = result.warnings.find(w => w.column === 'batch_number');
    expect(batchWarning).toBeDefined();
    expect(batchWarning?.severity).toBe('warning');
    expect(batchWarning?.message).toContain('AI will attempt to generate an ID');
  });

  it('should return warning (not error) for invalid quantity type', async () => {
    const rows = [
      {
        batch_number: 'BATCH-001',
        rejected_quantity: '10 (approx)', // String instead of number
      }
    ];
    const fileType: FileType = 'rejection';
    
    const result = await validateData(rows, fileType);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    const qtyWarning = result.warnings.find(w => w.column === 'rejected_quantity');
    expect(qtyWarning).toBeDefined();
    expect(qtyWarning?.severity).toBe('warning');
    expect(qtyWarning?.message).toContain('AI will attempt to parse');
  });

  it('should return warning (not error) for negative quantity', async () => {
    const rows = [
      {
        batch_number: 'BATCH-001',
        rejected_quantity: -5, // Negative value
      }
    ];
    const fileType: FileType = 'rejection';
    
    const result = await validateData(rows, fileType);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    const rangeWarning = result.warnings.find(w => w.column === 'rejected_quantity');
    expect(rangeWarning).toBeDefined();
    expect(rangeWarning?.severity).toBe('warning');
    expect(rangeWarning?.message).toContain('AI will normalize');
  });

  it('should pass valid data with no warnings', async () => {
    const rows = [
      {
        batch_number: 'BATCH-001',
        rejected_quantity: 10,
      }
    ];
    const fileType: FileType = 'rejection';
    
    const result = await validateData(rows, fileType);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
