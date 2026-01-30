// Database entity types

export interface RejectionRecord {
  id: number;
  timestamp: Date;
  lineId: number;
  lineName?: string;
  shiftId?: number;
  shiftName?: string;
  defectTypeId: number;
  defectName?: string;
  supplierId?: number;
  supplierName?: string;
  productId?: number;
  productName?: string;
  quantity: number;
  costPerUnit?: number;
  totalCost?: number;
  reason?: string;
  operatorId?: string;
  uploadedFileId?: number;
  createdAt: Date;
}

export interface DefectType {
  id: number;
  code: string;
  name: string;
  category?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionLine {
  id: number;
  name: string;
  department?: string;
  factoryId: number;
  active: boolean;
  createdAt: Date;
}

export interface Supplier {
  id: number;
  name: string;
  contactEmail?: string;
  qualityRating?: number;
  createdAt: Date;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  createdAt: Date;
}

export interface UploadedFile {
  id: number;
  uuid: string;
  originalFilename: string;
  storedPath: string;
  fileSizeBytes?: number;
  fileHash?: string;
  uploadedBy?: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  recordsProcessed: number;
  recordsFailed: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'GM' | 'ANALYST' | 'VIEWER';
  passwordHash?: string;
  lastLogin?: Date;
  createdAt: Date;
}

// Aggregated statistics types
export interface AggregatedStats {
  period: Date;
  lineId?: number;
  defectTypeId?: number;
  supplierId?: number;
  recordCount: number;
  totalRejected: number;
  avgQuantity: number;
  totalCost: number;
  maxSingleRejection: number;
}

export interface TopDefectResult {
  defectId: number;
  defectName: string;
  defectCode: string;
  count: number;
  percentage: number;
  lineName?: string;
}

export interface LineStats {
  lineId: number;
  lineName: string;
  totalRejected: number;
  incidentCount: number;
  avgRejectionRate: number;
}

export interface SupplierStats {
  supplierId: number;
  supplierName: string;
  totalUnits: number;
  totalRejections: number;
  rejectionRate: number;
  contribution: number;
}

// Query filter types
export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export interface RejectionFilter {
  lineIds?: number[];
  defectTypeIds?: number[];
  supplierIds?: number[];
  shiftIds?: number[];
}
