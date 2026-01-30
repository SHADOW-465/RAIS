-- Seed data for reference tables

-- Insert defect types
INSERT INTO defect_types (code, name, category, severity, description) VALUES
('LEAK', 'Leak', 'Assembly', 'HIGH', 'Fluid or gas leakage from component'),
('SCRATCH', 'Scratch', 'Visual', 'MEDIUM', 'Surface scratch or scuff mark'),
('MISALIGN', 'Misalignment', 'Assembly', 'HIGH', 'Component misalignment during assembly'),
('BURR', 'Burr', 'Machining', 'LOW', 'Rough edge or burr from machining process'),
('DENT', 'Dent', 'Handling', 'MEDIUM', 'Dent or deformation from handling'),
('CRACK', 'Crack', 'Structural', 'CRITICAL', 'Crack or fracture in component'),
('CONTAM', 'Contamination', 'Cleanliness', 'MEDIUM', 'Foreign material contamination'),
('DIMERR', 'Dimensional Error', 'Quality', 'HIGH', 'Out of spec dimension'),
('FINISH', 'Finish Defect', 'Surface', 'LOW', 'Paint, coating, or surface finish defect'),
('MISSING', 'Missing Part', 'Assembly', 'CRITICAL', 'Missing component or part')
ON CONFLICT (code) DO NOTHING;

-- Insert production lines
INSERT INTO production_lines (name, department, factory_id, active) VALUES
('Line 1', 'Assembly', 1, true),
('Line 2', 'Assembly', 1, true),
('Line 3', 'Assembly', 1, true),
('Line 4', 'Machining', 1, true),
('Line 5', 'Finishing', 1, true)
ON CONFLICT DO NOTHING;

-- Insert shifts
INSERT INTO shifts (name, start_time, end_time) VALUES
('Day Shift', '06:00:00', '14:00:00'),
('Night Shift', '14:00:00', '22:00:00'),
('Graveyard', '22:00:00', '06:00:00')
ON CONFLICT DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_email, quality_rating) VALUES
('Supplier A', 'contact@supplier-a.com', 4),
('Supplier B', 'contact@supplier-b.com', 3),
('Supplier C', 'contact@supplier-c.com', 5),
('Supplier D', 'contact@supplier-d.com', 2)
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (sku, name, category) VALUES
('PROD-001', 'Widget Type A', 'Widgets'),
('PROD-002', 'Widget Type B', 'Widgets'),
('PROD-003', 'Component X', 'Components'),
('PROD-004', 'Assembly Y', 'Assemblies')
ON CONFLICT (sku) DO NOTHING;

-- Insert default users (password: 'changeme' - bcrypt hash)
INSERT INTO users (email, name, role, password_hash) VALUES
('gm@company.com', 'General Manager', 'GM', '$2a$10$YourHashHere'),
('analyst@company.com', 'Quality Analyst', 'ANALYST', '$2a$10$YourHashHere')
ON CONFLICT (email) DO NOTHING;
