import * as XLSX from 'xlsx';
import { SchemaMapping, SchemaDetectionResult, FIELD_PATTERNS, REQUIRED_FIELDS } from './types';

export class SchemaDetector {
  detect(buffer: Buffer, sheetIndex: number = 0): SchemaDetectionResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers as row array
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    // Find header row (first row with >50% string cells that look like headers)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const stringCount = row.filter(cell => typeof cell === 'string' && cell.length > 0).length;
      const ratio = stringCount / row.length;
      
      // If more than 50% are non-empty strings, consider it a header row
      if (ratio > 0.5) {
        headerRowIndex = i;
        break;
      }
    }
    
    const headers = (jsonData[headerRowIndex] as string[]).map(h => String(h || '').trim());
    const dataRows = jsonData.slice(headerRowIndex + 1, headerRowIndex + 11); // Sample 10 rows
    
    // Map each column
    const mappings: SchemaMapping[] = headers.map((header, index) => {
      const normalizedHeader = header.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
      let bestMatch = { field: 'unknown', confidence: 0 };
      
      for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
          const similarity = this.calculateSimilarity(normalizedHeader, pattern);
          if (similarity > bestMatch.confidence) {
            bestMatch = { field, confidence: similarity };
          }
        }
      }
      
      // Extract sample values (non-empty)
      const sampleValues = (dataRows
        .map(row => row[index])
        .filter(v => v !== undefined && v !== null && v !== '') as (string | number | Date | undefined)[]);
      
      return {
        columnIndex: index,
        columnName: header,
        suggestedField: bestMatch.confidence > 0.5 ? bestMatch.field : 'unknown',
        confidence: Math.round(bestMatch.confidence * 100),
        sampleValues: sampleValues.slice(0, 5), // Limit to 5 samples
      };
    });
    
    // Check if required fields are present
    const detectedFields = new Set(mappings.map(m => m.suggestedField));
    const missingRequired = REQUIRED_FIELDS.filter(f => !detectedFields.has(f));
    
    if (missingRequired.length > 0) {
      console.warn('Missing required fields:', missingRequired);
    }
    
    return {
      mappings,
      headerRowIndex,
      totalRows: jsonData.length - headerRowIndex - 1,
      sheetName,
    };
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Word-level contains
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
          return 0.8;
        }
      }
    }
    
    // Levenshtein distance for similar words
    if (this.levenshteinDistance(s1, s2) <= 2) {
      return 0.7;
    }
    
    return 0;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const schemaDetector = new SchemaDetector();
