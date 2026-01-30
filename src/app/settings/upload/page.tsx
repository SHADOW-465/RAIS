'use client';

import { useState, useCallback } from 'react';
import styles from './upload.module.css';

interface SchemaMapping {
  columnIndex: number;
  columnName: string;
  suggestedField: string;
  confidence: number;
  sampleValues: (string | number | Date | undefined)[];
}

interface SchemaDetectionResult {
  mappings: SchemaMapping[];
  headerRowIndex: number;
  totalRows: number;
  sheetName: string;
}

interface ValidationError {
  rowNumber: number;
  column: string;
  value: unknown;
  error: string;
  severity: 'ERROR' | 'WARNING';
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [schema, setSchema] = useState<SchemaDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    recordsProcessed: number;
    recordsFailed: number;
    errors: ValidationError[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.(xlsx|xls)$/i)) {
      await processFile(droppedFile);
    } else {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setSchema(null);
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload/schema', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to detect schema');
      }

      const data = await response.json();
      setSchema(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !schema) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(schema.mappings));
      formData.append('options', JSON.stringify({ skipHeaderRows: schema.headerRowIndex }));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      date: 'Date',
      line: 'Production Line',
      defectType: 'Defect Type',
      quantity: 'Quantity',
      supplier: 'Supplier',
      cost: 'Cost',
      shift: 'Shift',
      product: 'Product',
      operator: 'Operator',
      reason: 'Reason',
      unknown: 'Unknown',
    };
    return labels[field] || field;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Upload Data</h1>
      </header>

      {/* Upload Zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className={styles.fileInput}
          id="file-upload"
        />
        <label htmlFor="file-upload" className={styles.dropZoneContent}>
          <div className={styles.icon}>📁</div>
          <p className={styles.dropText}>
            {isDragging ? 'Drop your file here' : 'Drag & drop your Excel file here'}
          </p>
          <p className={styles.hint}>
            or click to browse. Supported formats: .xlsx, .xls (max 50MB)
          </p>
        </label>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Analyzing file...</p>
        </div>
      )}

      {/* Schema Preview */}
      {schema && (
        <div className={styles.schemaSection}>
          <h2 className={styles.sectionTitle}>Schema Detection Results</h2>
          <p className={styles.fileInfo}>
            <strong>File:</strong> {file?.name} ({file?.size.toLocaleString()} bytes) | 
            <strong> Sheet:</strong> {schema.sheetName} | 
            <strong> Rows:</strong> {schema.totalRows.toLocaleString()}
          </p>

          <div className={styles.mappingsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Detected Field</th>
                  <th>Confidence</th>
                  <th>Sample Values</th>
                </tr>
              </thead>
              <tbody>
                {schema.mappings.map((mapping) => (
                  <tr key={mapping.columnIndex}>
                    <td><strong>{mapping.columnName}</strong></td>
                    <td>
                      <span className={`${styles.field} ${mapping.suggestedField === 'unknown' ? styles.unknown : ''}`}>
                        {getFieldLabel(mapping.suggestedField)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.confidence}>
                        <div 
                          className={styles.confidenceBar}
                          style={{ width: `${mapping.confidence}%` }}
                        />
                        <span>{mapping.confidence}%</span>
                      </div>
                    </td>
                    <td className={styles.samples}>
                      {mapping.sampleValues.slice(0, 3).map((val, i) => (
                        <span key={i} className={styles.sample}>
                          {String(val).substring(0, 20)}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className={styles.uploadButton}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Process Data'}
          </button>
        </div>
      )}

      {/* Upload Result */}
      {result && (
        <div className={`${styles.result} ${result.success ? styles.success : styles.warning}`}>
          <h3>{result.success ? '✅ Upload Successful' : '⚠️ Upload Completed with Issues'}</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{result.recordsProcessed.toLocaleString()}</span>
              <span className={styles.statLabel}>Records Processed</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{result.recordsFailed.toLocaleString()}</span>
              <span className={styles.statLabel}>Records Failed</span>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className={styles.errors}>
              <h4>Errors & Warnings:</h4>
              <ul>
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i} className={err.severity === 'ERROR' ? styles.errorItem : styles.warningItem}>
                    Row {err.rowNumber}: {err.error}
                  </li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
