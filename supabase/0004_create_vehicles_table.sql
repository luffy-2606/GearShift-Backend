-- Create vehicles table for customer vehicles
-- Each customer can have multiple vehicles

CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  vin VARCHAR(17) UNIQUE, -- Vehicle Identification Number
  license_plate VARCHAR(15),
  color VARCHAR(30),
  mileage INTEGER DEFAULT 0 CHECK (mileage >= 0),
  fuel_type VARCHAR(20) DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'plug-in_hybrid')),
  transmission VARCHAR(20) DEFAULT 'automatic' CHECK (transmission IN ('manual', 'automatic', 'cvt')),
  engine_type VARCHAR(50),
  trim VARCHAR(50),
  photo_urls TEXT[] DEFAULT '{}', -- Array of vehicle photo URLs
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own vehicles" ON vehicles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vehicles" ON vehicles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vehicles" ON vehicles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own vehicles" ON vehicles
  FOR DELETE USING (user_id = auth.uid());

-- Note: Mechanic access policy will be added after appointments table is created
-- This prevents circular dependency issues

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
