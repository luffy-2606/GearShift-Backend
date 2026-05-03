-- Add vehicles for test users
-- Run this after creating test users with hashed passwords

-- First, let's find the user IDs for our test users
-- Then add vehicles for each user

-- Add vehicle for customer1@email.com
INSERT INTO vehicles (
  user_id, make, model, year, vin, license_plate, color, mileage, fuel_type, transmission
)
SELECT 
  u.id,
  'Toyota',
  'Camry',
  2020,
  '1HGBG41UXMN109186',
  'TEST123',
  'Silver',
  45000,
  'gasoline',
  'automatic'
FROM users u 
WHERE u.email = 'customer1@email.com';

-- Add vehicle for customer2@email.com  
INSERT INTO vehicles (
  user_id, make, model, year, vin, license_plate, color, mileage, fuel_type, transmission
)
SELECT 
  u.id,
  'Honda',
  'Civic',
  2019,
  '2HGFC2F59MH123456',
  'TEST456',
  'Blue',
  62000,
  'gasoline',
  'automatic'
FROM users u 
WHERE u.email = 'customer2@email.com';

-- Add vehicle for customer3@email.com
INSERT INTO vehicles (
  user_id, make, model, year, vin, license_plate, color, mileage, fuel_type, transmission
)
SELECT 
  u.id,
  'Ford',
  'F-150',
  2021,
  '1FTFW1EF5EFC12345',
  'TEST789',
  'Red',
  28000,
  'gasoline',
  'automatic'
FROM users u 
WHERE u.email = 'customer3@email.com';

-- Add some sample service history for these vehicles
INSERT INTO service_history (
  vehicle_id, shop_id, mechanic_id, service_type, service_description,
  mileage_at_service, service_date, cost, labor_cost, parts_cost, total_cost,
  duration_minutes, notes
)
SELECT 
  v.id,
  s.id,
  me.id,
  'Oil Change',
  'Regular oil change with synthetic oil',
  v.mileage - 5000,
  NOW() - INTERVAL '3 months',
  45.00,
  25.00,
  20.00,
  45.00,
  45,
  'Customer requested synthetic oil for better engine protection'
FROM vehicles v
JOIN users u ON v.user_id = u.id
JOIN shops s ON s.id IN (SELECT id FROM shops LIMIT 1)
JOIN users me ON s.owner_id = me.id
WHERE u.email = 'customer1@email.com'
AND v.make = 'Toyota';

-- Add service history for Honda
INSERT INTO service_history (
  vehicle_id, shop_id, mechanic_id, service_type, service_description,
  mileage_at_service, service_date, cost, labor_cost, parts_cost, total_cost,
  duration_minutes, notes
)
SELECT 
  v.id,
  s.id,
  me.id,
  'Air Filter Replacement',
  'Engine air filter replacement',
  v.mileage - 3000,
  NOW() - INTERVAL '2 months',
  25.00,
  15.00,
  10.00,
  25.00,
  30,
  'Filter was heavily soiled, replacement necessary'
FROM vehicles v
JOIN users u ON v.user_id = u.id
JOIN shops s ON s.id IN (SELECT id FROM shops LIMIT 1)
JOIN users me ON s.owner_id = me.id
WHERE u.email = 'customer2@email.com'
AND v.make = 'Honda';

-- Add service history for Ford
INSERT INTO service_history (
  vehicle_id, shop_id, mechanic_id, service_type, service_description,
  mileage_at_service, service_date, cost, labor_cost, parts_cost, total_cost,
  duration_minutes, notes
)
SELECT 
  v.id,
  s.id,
  me.id,
  'Battery Replacement',
  'Car battery replacement and testing',
  v.mileage - 1000,
  NOW() - INTERVAL '1 month',
  185.00,
  45.00,
  140.00,
  185.00,
  60,
  'Old battery failed load test, new battery installed'
FROM vehicles v
JOIN users u ON v.user_id = u.id
JOIN shops s ON s.id IN (SELECT id FROM shops LIMIT 1)
JOIN users me ON s.owner_id = me.id
WHERE u.email = 'customer3@email.com'
AND v.make = 'Ford';
