-- RAIS Database Schema
-- PostgreSQL with TimescaleDB extension

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Reference table for defect types
CREATE TABLE IF NOT EXISTS defect_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference table for production lines
CREATE TABLE IF NOT EXISTS production_lines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    factory_id INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference table for shifts
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference table for suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference table for products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main time-series table for rejection records
CREATE TABLE IF NOT EXISTS rejection_records (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    line_id INTEGER NOT NULL REFERENCES production_lines(id),
    shift_id INTEGER REFERENCES shifts(id),
    defect_type_id INTEGER NOT NULL REFERENCES defect_types(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_per_unit DECIMAL(10,2),
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * COALESCE(cost_per_unit, 0)) STORED,
    reason TEXT,
    operator_id VARCHAR(50),
    uploaded_file_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('rejection_records', 'timestamp', 
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

-- Table for tracking uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    uploaded_by INTEGER,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0
);

-- Table for users (authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'ANALYST' CHECK (role IN ('GM', 'ANALYST', 'VIEWER')),
    password_hash VARCHAR(255),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rejection_line_time 
    ON rejection_records (line_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rejection_defect_time 
    ON rejection_records (defect_type_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rejection_supplier_time 
    ON rejection_records (supplier_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rejection_timestamp 
    ON rejection_records (timestamp DESC);

-- Continuous aggregate for daily statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_rejection_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS day,
    line_id,
    defect_type_id,
    supplier_id,
    COUNT(*) as record_count,
    SUM(quantity) as total_rejected,
    AVG(quantity) as avg_quantity,
    SUM(total_cost) as total_cost,
    MAX(quantity) as max_single_rejection
FROM rejection_records
GROUP BY day, line_id, defect_type_id, supplier_id;

-- Policy to refresh continuous aggregate
SELECT add_continuous_aggregate_policy('daily_rejection_stats',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Add comments for documentation
COMMENT ON TABLE rejection_records IS 'Time-series data of manufacturing rejections';
COMMENT ON TABLE defect_types IS 'Reference table for defect categories';
COMMENT ON TABLE production_lines IS 'Reference table for production lines';
COMMENT ON TABLE suppliers IS 'Reference table for suppliers';
COMMENT ON TABLE uploaded_files IS 'Audit trail of uploaded Excel files';
COMMENT ON TABLE users IS 'User accounts for authentication';
