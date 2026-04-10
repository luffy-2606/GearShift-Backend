-- Sample Data for GearShift Customer Interface
-- Run this after all migrations are complete

-- Insert sample mechanic users with shop details
INSERT INTO users (
  email, password, first_name, last_name, role, phone, 
  business_name, years_experience, specialization, hourly_rate,
  shop_latitude, shop_longitude, shop_address, shop_phone,
  is_verified, verification_date
) VALUES
(
  'john@garage.com', '$2a$10$placeholder_hash', 'John', 'Smith', 'mechanic',
  '555-0101', 'John''s Auto Repair', 15, 
  ARRAY['engine', 'transmission', 'brakes'], 85.00,
  40.7128, -74.0060, '123 Main St, New York, NY 10001', '555-0101',
  true, NOW()
),
(
  'sarah@repair.com', '$2a$10$placeholder_hash', 'Sarah', 'Johnson', 'mechanic',
  '555-0102', 'Sarah''s Car Care', 12,
  ARRAY['oil_change', 'tire_service', 'battery'], 75.00,
  34.0522, -118.2437, '456 Oak Ave, Los Angeles, CA 90001', '555-0102',
  true, NOW()
),
(
  'mike@motors.com', '$2a$10$placeholder_hash', 'Mike', 'Wilson', 'mechanic',
  '555-0103', 'Mike''s Motor Works', 20,
  ARRAY['engine', 'diagnostic', 'electrical'], 95.00,
  41.8781, -87.6298, '789 Elm St, Chicago, IL 60601', '555-0103',
  true, NOW()
);

-- Insert sample shops (these will be linked to the mechanics above)
INSERT INTO shops (
  owner_id, name, description, address, latitude, longitude, phone,
  services_offered, specialties, average_rating, total_reviews,
  is_verified, status
) 
SELECT 
  u.id,
  u.business_name,
  CASE 
    WHEN u.first_name = 'John' THEN 'Full-service auto repair with over 15 years of experience. Specializing in engine and transmission work.'
    WHEN u.first_name = 'Sarah' THEN 'Quick and reliable car maintenance. We specialize in oil changes, tires, and battery services.'
    WHEN u.first_name = 'Mike' THEN 'Premium automotive diagnostics and repair. Expert engine diagnostics and electrical work.'
  END,
  u.shop_address,
  u.shop_latitude,
  u.shop_longitude,
  u.shop_phone,
  CASE 
    WHEN u.first_name = 'John' THEN ARRAY['Oil Change', 'Brake Repair', 'Engine Repair', 'Transmission Service', 'Diagnostic']
    WHEN u.first_name = 'Sarah' THEN ARRAY['Oil Change', 'Tire Rotation', 'Battery Replacement', 'Air Filter', 'Wiper Blades']
    WHEN u.first_name = 'Mike' THEN ARRAY['Engine Diagnostic', 'Electrical Repair', 'Check Engine Light', 'Battery Service', 'Starter Repair']
  END,
  u.specialization,
  CASE 
    WHEN u.first_name = 'John' THEN 4.8
    WHEN u.first_name = 'Sarah' THEN 4.6
    WHEN u.first_name = 'Mike' THEN 4.9
  END,
  CASE 
    WHEN u.first_name = 'John' THEN 127
    WHEN u.first_name = 'Sarah' THEN 89
    WHEN u.first_name = 'Mike' THEN 156
  END,
  u.is_verified,
  'active'
FROM users u 
WHERE u.role = 'mechanic' AND u.email IN ('john@garage.com', 'sarah@repair.com', 'mike@motors.com');

-- Insert sample customer users
INSERT INTO users (
  email, password, first_name, last_name, role, phone,
  driver_license_number, insurance_provider, insurance_policy_number
) VALUES
(
  'customer1@email.com', '$2a$10$placeholder_hash', 'Alice', 'Brown', 'user',
  '555-0201', 'DL12345678', 'State Farm', 'POL123456'
),
(
  'customer2@email.com', '$2a$10$placeholder_hash', 'Bob', 'Davis', 'user',
  '555-0202', 'DL87654321', 'Geico', 'POL876543'
),
(
  'customer3@email.com', '$2a$10$placeholder_hash', 'Carol', 'Miller', 'user',
  '555-0203', 'DL11223344', 'Progressive', 'POL112233'
);

-- Insert sample vehicles for customers
INSERT INTO vehicles (
  user_id, make, model, year, vin, license_plate, color, mileage, fuel_type, transmission
)
SELECT 
  u.id,
  CASE 
    WHEN u.first_name = 'Alice' THEN 'Toyota'
    WHEN u.first_name = 'Bob' THEN 'Honda'
    WHEN u.first_name = 'Carol' THEN 'Ford'
  END,
  CASE 
    WHEN u.first_name = 'Alice' THEN 'Camry'
    WHEN u.first_name = 'Bob' THEN 'Civic'
    WHEN u.first_name = 'Carol' THEN 'F-150'
  END,
  CASE 
    WHEN u.first_name = 'Alice' THEN 2020
    WHEN u.first_name = 'Bob' THEN 2019
    WHEN u.first_name = 'Carol' THEN 2021
  END,
  CASE 
    WHEN u.first_name = 'Alice' THEN '1HGBG41UXMN109186'
    WHEN u.first_name = 'Bob' THEN '2HGFC2F59MH123456'
    WHEN u.first_name = 'Carol' THEN '1FTFW1EF5EFC12345'
  END,
  CASE 
    WHEN u.first_name = 'Alice' THEN 'ABC123'
    WHEN u.first_name = 'Bob' THEN 'XYZ789'
    WHEN u.first_name = 'Carol' THEN 'DEF456'
  END,
  CASE 
    WHEN u.first_name = 'Alice' THEN 'Silver'
    WHEN u.first_name = 'Bob' THEN 'Blue'
    WHEN u.first_name = 'Carol' THEN 'Red'
  END,
  CASE 
    WHEN u.first_name = 'Alice' THEN 45000
    WHEN u.first_name = 'Bob' THEN 62000
    WHEN u.first_name = 'Carol' THEN 28000
  END,
  'gasoline',
  'automatic'
FROM users u 
WHERE u.role = 'customer' AND u.email IN ('customer1@email.com', 'customer2@email.com', 'customer3@email.com');

-- Insert sample cost insights for common services
INSERT INTO cost_insights (
  service_type, service_category, location_type, location_name,
  avg_cost, min_cost, max_cost, median_cost, data_points_count,
  confidence_level
) VALUES
-- Oil Change costs by city
('Oil Change', 'maintenance', 'city', 'New York', 45.00, 25.00, 80.00, 42.00, 250, 'high'),
('Oil Change', 'maintenance', 'city', 'Los Angeles', 52.00, 30.00, 85.00, 48.00, 180, 'high'),
('Oil Change', 'maintenance', 'city', 'Chicago', 38.00, 20.00, 65.00, 35.00, 120, 'medium'),

-- Brake Repair costs by city
('Brake Repair', 'repair', 'city', 'New York', 280.00, 150.00, 450.00, 265.00, 95, 'medium'),
('Brake Repair', 'repair', 'city', 'Los Angeles', 320.00, 180.00, 500.00, 310.00, 110, 'medium'),
('Brake Repair', 'repair', 'city', 'Chicago', 245.00, 140.00, 400.00, 235.00, 78, 'medium'),

-- Battery Replacement costs by city
('Battery Replacement', 'repair', 'city', 'New York', 185.00, 120.00, 280.00, 175.00, 65, 'medium'),
('Battery Replacement', 'repair', 'city', 'Los Angeles', 195.00, 130.00, 290.00, 185.00, 72, 'medium'),
('Battery Replacement', 'repair', 'city', 'Chicago', 165.00, 110.00, 250.00, 160.00, 58, 'medium');

-- Insert sample appointments
INSERT INTO appointments (
  customer_id, mechanic_id, shop_id, vehicle_id, service_name, service_description,
  scheduled_date, status, estimated_cost, customer_notes
)
SELECT 
  cu.id,
  me.id,
  s.id,
  v.id,
  CASE 
    WHEN cu.first_name = 'Alice' THEN 'Oil Change + Tire Rotation'
    WHEN cu.first_name = 'Bob' THEN 'Brake Pad Replacement'
    WHEN cu.first_name = 'Carol' THEN 'Engine Diagnostic'
  END,
  CASE 
    WHEN cu.first_name = 'Alice' THEN 'Regular maintenance oil change and tire rotation service'
    WHEN cu.first_name = 'Bob' THEN 'Front brake pad replacement with rotor inspection'
    WHEN cu.first_name = 'Carol' THEN 'Check engine light diagnosis and troubleshooting'
  END,
  CASE 
    WHEN cu.first_name = 'Alice' THEN NOW() + INTERVAL '2 days'
    WHEN cu.first_name = 'Bob' THEN NOW() + INTERVAL '3 days'
    WHEN cu.first_name = 'Carol' THEN NOW() + INTERVAL '1 day'
  END,
  'scheduled',
  CASE 
    WHEN cu.first_name = 'Alice' THEN 65.00
    WHEN cu.first_name = 'Bob' THEN 320.00
    WHEN cu.first_name = 'Carol' THEN 120.00
  END,
  CASE 
    WHEN cu.first_name = 'Alice' THEN 'Please use synthetic oil'
    WHEN cu.first_name = 'Bob' THEN 'Car is pulling to the right when braking'
    WHEN cu.first_name = 'Carol' THEN 'Check engine light came on after fueling'
  END
FROM users cu
JOIN vehicles v ON cu.id = v.user_id
JOIN shops s ON s.id IN (SELECT id FROM shops LIMIT 3)
JOIN users me ON s.owner_id = me.id
WHERE cu.role = 'user' 
AND cu.email IN ('customer1@email.com', 'customer2@email.com', 'customer3@email.com')
AND v.make = CASE 
  WHEN cu.first_name = 'Alice' THEN 'Toyota'
  WHEN cu.first_name = 'Bob' THEN 'Honda'
  WHEN cu.first_name = 'Carol' THEN 'Ford'
END;

-- Insert sample service history
INSERT INTO service_history (
  vehicle_id, shop_id, mechanic_id, service_type, service_description,
  mileage_at_service, service_date, cost, labor_cost, parts_cost, total_cost,
  duration_minutes, notes
)
SELECT 
  v.id,
  s.id,
  me.id,
  CASE 
    WHEN v.make = 'Toyota' THEN 'Oil Change'
    WHEN v.make = 'Honda' THEN 'Air Filter Replacement'
    WHEN v.make = 'Ford' THEN 'Battery Replacement'
  END,
  CASE 
    WHEN v.make = 'Toyota' THEN 'Regular oil change with synthetic oil'
    WHEN v.make = 'Honda' THEN 'Engine air filter replacement'
    WHEN v.make = 'Ford' THEN 'Car battery replacement and testing'
  END,
  v.mileage - 5000,
  NOW() - INTERVAL '3 months',
  CASE 
    WHEN v.make = 'Toyota' THEN 45.00
    WHEN v.make = 'Honda' THEN 25.00
    WHEN v.make = 'Ford' THEN 185.00
  END,
  CASE 
    WHEN v.make = 'Toyota' THEN 25.00
    WHEN v.make = 'Honda' THEN 15.00
    WHEN v.make = 'Ford' THEN 45.00
  END,
  CASE 
    WHEN v.make = 'Toyota' THEN 20.00
    WHEN v.make = 'Honda' THEN 10.00
    WHEN v.make = 'Ford' THEN 140.00
  END,
  CASE 
    WHEN v.make = 'Toyota' THEN 45.00
    WHEN v.make = 'Honda' THEN 25.00
    WHEN v.make = 'Ford' THEN 185.00
  END,
  45,
  CASE 
    WHEN v.make = 'Toyota' THEN 'Customer requested synthetic oil for better engine protection'
    WHEN v.make = 'Honda' THEN 'Filter was heavily soiled, replacement necessary'
    WHEN v.make = 'Ford' THEN 'Old battery failed load test, new battery installed'
  END
FROM vehicles v
JOIN shops s ON s.id IN (SELECT id FROM shops LIMIT 3)
JOIN users me ON s.owner_id = me.id
WHERE v.make IN ('Toyota', 'Honda', 'Ford')
AND v.license_plate IN ('ABC123', 'XYZ789', 'DEF456');
