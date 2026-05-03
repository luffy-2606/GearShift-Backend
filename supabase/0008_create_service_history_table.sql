-- Create service_history table for tracking vehicle service records
-- Maintains complete service history for each vehicle

CREATE TABLE service_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- Link to appointment if exists
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  service_type VARCHAR(200) NOT NULL,
  service_description TEXT,
  service_category VARCHAR(100),
  mileage_at_service INTEGER NOT NULL CHECK (mileage_at_service >= 0),
  service_date TIMESTAMP WITH TIME ZONE NOT NULL,
  cost DECIMAL(10,2) CHECK (cost >= 0),
  labor_cost DECIMAL(10,2) CHECK (labor_cost >= 0),
  parts_cost DECIMAL(10,2) CHECK (parts_cost >= 0),
  tax_amount DECIMAL(10,2) CHECK (tax_amount >= 0),
  total_cost DECIMAL(10,2) CHECK (total_cost >= 0),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  parts_used TEXT[] DEFAULT '{}', -- Array of parts with details: [{"name": "Oil Filter", "part_number": "XYZ123", "quantity": 1, "price": 15.00}]
  warranty_months INTEGER DEFAULT 12, -- Warranty period in months
  warranty_miles INTEGER DEFAULT 12000, -- Warranty period in miles
  notes TEXT,
  internal_notes TEXT, -- Shop internal notes
  photos TEXT[] DEFAULT '{}', -- Photos of the service
  documents TEXT[] DEFAULT '{}', -- Related documents (invoices, etc.)
  next_service_due_date TIMESTAMP WITH TIME ZONE,
  next_service_due_mileage INTEGER,
  is_warranty_claim BOOLEAN DEFAULT false,
  is_insurance_claim BOOLEAN DEFAULT false,
  claim_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_service_history_vehicle_id ON service_history(vehicle_id);
CREATE INDEX idx_service_history_appointment_id ON service_history(appointment_id);
CREATE INDEX idx_service_history_shop_id ON service_history(shop_id);
CREATE INDEX idx_service_history_mechanic_id ON service_history(mechanic_id);
CREATE INDEX idx_service_history_service_date ON service_history(service_date DESC);
CREATE INDEX idx_service_history_service_type ON service_history(service_type);
CREATE INDEX idx_service_history_mileage ON service_history(mileage_at_service);
CREATE INDEX idx_service_history_cost ON service_history(total_cost);

-- Enable RLS
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vehicle owners can read own service history" ON service_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = service_history.vehicle_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can read service history they performed" ON service_history
  FOR SELECT USING (mechanic_id = auth.uid());

CREATE POLICY "Shop owners can read shop service history" ON service_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = service_history.shop_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can create service history" ON service_history
  FOR INSERT WITH CHECK (mechanic_id = auth.uid());

CREATE POLICY "Shop owners can create service history for their shop" ON service_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = service_history.shop_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Mechanics can update service history they created" ON service_history
  FOR UPDATE USING (mechanic_id = auth.uid());

CREATE POLICY "Shop owners can update shop service history" ON service_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = service_history.shop_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all service history" ON service_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all service history" ON service_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_service_history_updated_at 
    BEFORE UPDATE ON service_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
