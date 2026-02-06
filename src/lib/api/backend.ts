/**
 * RAIS Frontend - Backend API Client
 * Communicates with Python FastAPI backend for data processing
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ============================================================================
// TYPES
// ============================================================================

export type ProcessingStatus =
  | 'uploading'
  | 'parsing'
  | 'validating'
  | 'computing'
  | 'completed'
  | 'failed';

export interface UploadResponse {
  upload_id: string;
  message: string;
  files_received: number;
  status: ProcessingStatus;
}

export interface ProcessingStatusResponse {
  upload_id: string;
  status: ProcessingStatus;
  progress_percent: number;
  current_stage: string;
  files_processed: number;
  total_files: number;
  errors: string[];
  started_at: string;
  completed_at: string | null;
}

export interface DataSource {
  file_name: string;
  sheet_name: string;
  row_numbers: number[];
  column_name?: string;
}

export interface KPIData {
  rejection_rate: number;
  rejection_rate_change: number;
  rejection_trend: 'up' | 'down' | 'stable';
  yield_rate: number;
  total_produced: number;
  total_dispatched: number;
  total_rejected: number;
  production_date: string;
  financial_impact: number;
  watch_batches: number;
  sources: DataSource[];
}

export interface StageKPI {
  stage_code: string;
  stage_name: string;
  inspected: number;
  accepted: number;
  rejected: number;
  rejection_rate: number;
  contribution_percent: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TrendSeries {
  name: string;
  data: TrendDataPoint[];
  color?: string;
}

export interface TrendChart {
  title: string;
  x_label: string;
  y_label: string;
  series: TrendSeries[];
}

export interface DefectData {
  defect_code: string;
  defect_name: string;
  category: string;
  severity: string;
  count: number;
  percentage: number;
  cumulative_percentage: number;
}

export interface ParetoChart {
  title: string;
  defects: DefectData[];
  threshold_80: number;
}

export interface DefectTrend {
  defect_code: string;
  defect_name: string;
  monthly_data: TrendDataPoint[];
  average_rate: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
}

export interface StatsResponse {
  kpis: KPIData;
  stage_kpis: StageKPI[];
  rejection_trend: TrendChart;
  defect_pareto: ParetoChart;
  visual_defect_trends: DefectTrend[];
  ai_summary: string | null;
  generated_at: string;
}

export interface StatsFilter {
  start_date?: string;
  end_date?: string;
  stage?: string;
  month?: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Upload Excel files to the backend for processing
   */
  async uploadFiles(files: File[]): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  /**
   * Poll processing status for an upload
   */
  async getProcessingStatus(uploadId: string): Promise<ProcessingStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/process/${uploadId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Status check failed' }));
      throw new Error(error.detail || 'Status check failed');
    }

    return response.json();
  }

  /**
   * Poll until processing completes or fails
   */
  async waitForProcessing(
    uploadId: string,
    onProgress?: (status: ProcessingStatusResponse) => void,
    pollIntervalMs: number = 1000,
    timeoutMs: number = 300000
  ): Promise<ProcessingStatusResponse> {
    const startTime = Date.now();

    while (true) {
      const status = await this.getProcessingStatus(uploadId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Processing timeout');
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Get computed statistics with optional filters
   */
  async getStats(filters?: StatsFilter): Promise<StatsResponse> {
    const response = await fetch(`${this.baseUrl}/api/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters || {}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get stats' }));
      throw new Error(error.detail || 'Failed to get stats');
    }

    return response.json();
  }

  /**
   * Get quick overview for dashboard
   */
  async getOverview(): Promise<{ has_data: boolean;[key: string]: unknown }> {
    const response = await fetch(`${this.baseUrl}/api/stats/overview`);

    if (!response.ok) {
      return { has_data: false };
    }

    return response.json();
  }

  /**
   * Export data in specified format
   */
  async exportData(format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/api/export?format=${format}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Get list of defect types
   */
  async getDefects(): Promise<{ defects: Array<{ code: string; name: string; category: string; severity: string }> }> {
    const response = await fetch(`${this.baseUrl}/api/defects`);
    if (!response.ok) {
      throw new Error('Failed to get defects');
    }
    return response.json();
  }

  /**
   * Get list of inspection stages
   */
  async getStages(): Promise<{ stages: Array<{ code: string; name: string; sequence: number }> }> {
    const response = await fetch(`${this.baseUrl}/api/stages`);
    if (!response.ok) {
      throw new Error('Failed to get stages');
    }
    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Reset database and clear all files
   */
  async resetDatabase(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/reset`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Reset failed');
    }
    return response.json();
  }
}

// Export singleton instance
export const backendApi = new BackendApiClient();

// Export class for testing/custom instances
export { BackendApiClient };
