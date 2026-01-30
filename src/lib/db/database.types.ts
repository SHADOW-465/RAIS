// Supabase Database Types
// Generated based on existing PostgreSQL schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      rejection_records: {
        Row: {
          id: number;
          timestamp: string;
          line_id: number;
          shift_id: number | null;
          defect_type_id: number;
          supplier_id: number | null;
          product_id: number | null;
          quantity: number;
          cost_per_unit: number | null;
          total_cost: number | null;
          reason: string | null;
          operator_id: string | null;
          uploaded_file_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          timestamp: string;
          line_id: number;
          shift_id?: number | null;
          defect_type_id: number;
          supplier_id?: number | null;
          product_id?: number | null;
          quantity: number;
          cost_per_unit?: number | null;
          total_cost?: number | null;
          reason?: string | null;
          operator_id?: string | null;
          uploaded_file_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          timestamp?: string;
          line_id?: number;
          shift_id?: number | null;
          defect_type_id?: number;
          supplier_id?: number | null;
          product_id?: number | null;
          quantity?: number;
          cost_per_unit?: number | null;
          total_cost?: number | null;
          reason?: string | null;
          operator_id?: string | null;
          uploaded_file_id?: number | null;
          created_at?: string;
        };
      };
      defect_types: {
        Row: {
          id: number;
          code: string;
          name: string;
          category: string | null;
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          code: string;
          name: string;
          category?: string | null;
          severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          name?: string;
          category?: string | null;
          severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      production_lines: {
        Row: {
          id: number;
          name: string;
          department: string | null;
          factory_id: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          department?: string | null;
          factory_id?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          department?: string | null;
          factory_id?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: number;
          name: string;
          contact_email: string | null;
          quality_rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          contact_email?: string | null;
          quality_rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          contact_email?: string | null;
          quality_rating?: number | null;
          created_at?: string;
        };
      };
      shifts: {
        Row: {
          id: number;
          name: string;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
      };
      uploaded_files: {
        Row: {
          id: number;
          uuid: string;
          original_filename: string;
          stored_path: string;
          file_size_bytes: number | null;
          file_hash: string | null;
          uploaded_by: number | null;
          uploaded_at: string;
          processed_at: string | null;
          status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          error_message: string | null;
          records_processed: number;
          records_failed: number;
        };
        Insert: {
          id?: number;
          uuid?: string;
          original_filename: string;
          stored_path: string;
          file_size_bytes?: number | null;
          file_hash?: string | null;
          uploaded_by?: number | null;
          uploaded_at?: string;
          processed_at?: string | null;
          status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          error_message?: string | null;
          records_processed?: number;
          records_failed?: number;
        };
        Update: {
          id?: number;
          uuid?: string;
          original_filename?: string;
          stored_path?: string;
          file_size_bytes?: number | null;
          file_hash?: string | null;
          uploaded_by?: number | null;
          uploaded_at?: string;
          processed_at?: string | null;
          status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          error_message?: string | null;
          records_processed?: number;
          records_failed?: number;
        };
      };
      users: {
        Row: {
          id: number;
          email: string;
          name: string;
          role: 'GM' | 'ANALYST' | 'VIEWER';
          password_hash: string | null;
          last_login: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          email: string;
          name: string;
          role: 'GM' | 'ANALYST' | 'VIEWER';
          password_hash?: string | null;
          last_login?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          email?: string;
          name?: string;
          role?: 'GM' | 'ANALYST' | 'VIEWER';
          password_hash?: string | null;
          last_login?: string | null;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          sku: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          sku?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          sku?: string | null;
          created_at?: string;
        };
      };
      factories: {
        Row: {
          id: number;
          name: string;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          location?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
