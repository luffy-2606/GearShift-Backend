-- Enhanced users table with role-specific fields
-- This migration adds fields to support different user types and their specific needs

-- Add common profile fields
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN profile_image_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN city VARCHAR(100);
ALTER TABLE users ADD COLUMN state VARCHAR(100);
ALTER TABLE users ADD COLUMN postal_code VARCHAR(20);
ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT 'USA';

-- Add customer-specific fields
ALTER TABLE users ADD COLUMN driver_license_number VARCHAR(50);
ALTER TABLE users ADD COLUMN insurance_provider VARCHAR(100);
ALTER TABLE users ADD COLUMN insurance_policy_number VARCHAR(50);

-- Add mechanic-specific fields
ALTER TABLE users ADD COLUMN business_name VARCHAR(200);
ALTER TABLE users ADD COLUMN business_license VARCHAR(100);
ALTER TABLE users ADD COLUMN years_experience INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN specialization TEXT[]; -- Array of specializations
ALTER TABLE users ADD COLUMN hourly_rate DECIMAL(10,2);
ALTER TABLE users ADD COLUMN shop_latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN shop_longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN shop_address TEXT;
ALTER TABLE users ADD COLUMN shop_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN shop_hours JSONB; -- Store operating hours as JSON

-- Add admin-specific fields
ALTER TABLE users ADD COLUMN admin_permissions TEXT[] DEFAULT ARRAY['basic']; -- Array of permissions
ALTER TABLE users ADD COLUMN department VARCHAR(100);

-- Add verification fields
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_documents TEXT[]; -- Array of document URLs
ALTER TABLE users ADD COLUMN verification_date TIMESTAMP WITH TIME ZONE;

-- Add preference fields
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "sms": false}'::jsonb;

-- Add indexes for performance
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_verified ON users(is_verified);
CREATE INDEX idx_users_specialization ON users USING GIN(specialization);
CREATE INDEX idx_users_shop_location ON users(shop_latitude, shop_longitude) WHERE role = 'mechanic';

-- Update RLS policies to handle new fields
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON users;

-- Create enhanced policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Public read access for verified mechanics (for shop locator)
CREATE POLICY "Public can read verified mechanics" ON users
  FOR SELECT USING (
    role = 'mechanic' 
    AND is_verified = true
  );
