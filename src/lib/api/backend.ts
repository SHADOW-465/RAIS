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
  file_name?: string;
  file_size_bytes?: number;
  records_valid?: number;
  records_invalid?: number;
  detected_file_type?: string;
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async uploadFiles(files: File[]): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await fetch(`${this.baseUrl}/api/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  async getProcessingStatus(uploadId: string): Promise<ProcessingStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/process/${uploadId}`);
    if (!response.ok) throw new Error('Status check failed');
    return response.json();
  }

  async getUploadHistory(): Promise<ProcessingStatusResponse[]> {
    const response = await fetch(`${this.baseUrl}/api/uploads`);
    if (!response.ok) return [];
    return response.json();
  }

  async getStats(): Promise<StatsResponse> {
    const response = await fetch(`${this.baseUrl}/api/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  async getOverview(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stats/overview`);
      if (!response.ok) return { has_data: false };
      return response.json();
    } catch {
      return { has_data: false };
    }
  }

  async resetDatabase(): Promise<void> {
    await fetch(`${this.baseUrl}/api/reset`, { method: 'POST' });
  }
}

export const backendApi = new BackendApiClient();
