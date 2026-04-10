-- Create shops table for mechanic shop details
-- Each mechanic can have one shop

CREATE TABLE shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- Mechanic user
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  hours JSONB, -- Operating hours as JSON: {"monday": "9:00-17:00", ...}
  services_offered TEXT[] DEFAULT '{}', -- Array of service types offered
  specialties TEXT[] DEFAULT '{}', -- Array of specializations (e.g., "engine", "transmission")
  photos TEXT[] DEFAULT '{}', -- Array of shop photo URLs
  established_year INTEGER CHECK (established_year >= 1900 AND established_year <= EXTRACT(YEAR FROM NOW())),
  number_of_bays INTEGER DEFAULT 1 CHECK (number_of_bays >= 1),
  accepts_credit_card BOOLEAN DEFAULT true,
  accepts_debit_card BOOLEAN DEFAULT true,
  accepts_cash BOOLEAN DEFAULT true,
  accepts_digital_payment BOOLEAN DEFAULT false,
  has_wifi BOOLEAN DEFAULT false,
  has_waiting_area BOOLEAN DEFAULT false,
  provides_shuttle BOOLEAN DEFAULT false,
  provides_loaner BOOLEAN DEFAULT false,
  warranty_info TEXT,
  certifications TEXT[] DEFAULT '{}', -- Array of certifications
  insurance_accepted TEXT[] DEFAULT '{}', -- Array of insurance providers
  average_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
  total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_location ON shops(latitude, longitude);
CREATE INDEX idx_shops_services ON shops USING GIN(services_offered);
CREATE INDEX idx_shops_specialties ON shops USING GIN(specialties);
CREATE INDEX idx_shops_rating ON shops(average_rating DESC);
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_verified ON shops(is_verified);

-- Enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can read active verified shops" ON shops
  FOR SELECT USING (status = 'active' AND is_verified = true);

CREATE POLICY "Shop owners can read own shop" ON shops
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Shop owners can insert own shop" ON shops
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Shop owners can update own shop" ON shops
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Shop owners can delete own shop" ON shops
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Admins can read all shops" ON shops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all shops" ON shops
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_shops_updated_at 
    BEFORE UPDATE ON shops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
