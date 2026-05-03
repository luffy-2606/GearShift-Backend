-- Create appointments table for booking system
-- Connects customers, mechanics, shops, and vehicles

CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Standard service
  service_name VARCHAR(200) NOT NULL, -- Custom service name if not standard
  service_description TEXT,
  estimated_duration_minutes INTEGER,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  actual_duration_minutes INTEGER,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 
    'cancelled', 'no_show', 'rescheduled'
  )),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  customer_notes TEXT,
  mechanic_notes TEXT,
  internal_notes TEXT, -- Shop internal notes
  parts_used TEXT[] DEFAULT '{}', -- Array of parts used
  photos_before TEXT[] DEFAULT '{}', -- Photos before service
  photos_after TEXT[] DEFAULT '{}', -- Photos after service
  warranty_info TEXT,
  next_service_date TIMESTAMP WITH TIME ZONE,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'partial', 'refunded', 'disputed'
  )),
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_appointments_mechanic_id ON appointments(mechanic_id);
CREATE INDEX idx_appointments_shop_id ON appointments(shop_id);
CREATE INDEX idx_appointments_vehicle_id ON appointments(vehicle_id);
CREATE INDEX idx_appointments_service_id ON appointments(service_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_payment_status ON appointments(payment_status);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Customers can read own appointments" ON appointments
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Mechanics can read assigned appointments" ON appointments
  FOR SELECT USING (mechanic_id = auth.uid());

CREATE POLICY "Shop owners can read shop appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = appointments.shop_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create appointments" ON appointments
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own appointments" ON appointments
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Mechanics can update assigned appointments" ON appointments
  FOR UPDATE USING (mechanic_id = auth.uid());

CREATE POLICY "Shop owners can update shop appointments" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = appointments.shop_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all appointments" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
