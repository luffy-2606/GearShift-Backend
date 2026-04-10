-- Create services table for service types and pricing
-- Master list of all services that can be offered

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- e.g., "maintenance", "repair", "diagnostic"
  subcategory VARCHAR(100), -- e.g., "oil_change", "brake_repair", "engine_diagnostic"
  estimated_duration_minutes INTEGER DEFAULT 60 CHECK (estimated_duration_minutes > 0),
  base_price DECIMAL(10,2) CHECK (base_price >= 0),
  price_range_min DECIMAL(10,2) CHECK (price_range_min >= 0),
  price_range_max DECIMAL(10,2) CHECK (price_range_max >= price_range_min),
  difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert')),
  required_tools TEXT[] DEFAULT '{}', -- Array of required tools
  common_parts TEXT[] DEFAULT '{}', -- Array of commonly needed parts
  recommended_frequency INTEGER, -- Recommended frequency in months (for maintenance)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_subcategory ON services(subcategory);
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_active ON services(is_active);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Services are generally public read-only
CREATE POLICY "Public can read active services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can read all services" ON services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert services" ON services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update services" ON services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete services" ON services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert common services
INSERT INTO services (name, description, category, subcategory, estimated_duration_minutes, base_price, price_range_min, price_range_max, difficulty_level, recommended_frequency) VALUES
('Oil Change', 'Standard engine oil and filter replacement', 'maintenance', 'oil_change', 30, 35.00, 25.00, 60.00, 'easy', 3),
('Brake Pad Replacement', 'Replace front or rear brake pads', 'repair', 'brake_repair', 90, 150.00, 100.00, 300.00, 'medium', NULL),
('Battery Replacement', 'Remove and replace car battery', 'repair', 'electrical', 30, 120.00, 80.00, 200.00, 'easy', NULL),
('Tire Rotation', 'Rotate tires for even wear', 'maintenance', 'tire_service', 30, 25.00, 15.00, 50.00, 'easy', 6),
('Engine Diagnostic', 'Computer diagnostic to identify engine issues', 'diagnostic', 'engine_diagnostic', 60, 100.00, 75.00, 150.00, 'hard', NULL),
('Air Filter Replacement', 'Replace engine air filter', 'maintenance', 'filter_replacement', 20, 20.00, 15.00, 40.00, 'easy', 12),
('Transmission Fluid Change', 'Replace transmission fluid and filter', 'maintenance', 'fluid_service', 120, 150.00, 100.00, 250.00, 'medium', 24),
('Coolant Flush', 'Flush and replace engine coolant', 'maintenance', 'fluid_service', 90, 100.00, 75.00, 150.00, 'medium', 24),
('Check Engine Light Diagnosis', 'Diagnose check engine light codes', 'diagnostic', 'engine_diagnostic', 45, 80.00, 60.00, 120.00, 'medium', NULL),
('AC Service', 'Check and recharge air conditioning system', 'repair', 'hvac', 90, 120.00, 80.00, 200.00, 'medium', NULL);
