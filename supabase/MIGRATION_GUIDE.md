# GearShift Database Migration Guide

## Overview
This guide explains how to set up the complete database schema for Sprint 2 features including Shops Locator, Mechanic Matchmaking, Service History Tracker, and Cost Insights.

## Migration Files (Run in Order)

### 1. Enhanced Users Table
**File:** `0003_enhance_users_table.sql`
**Purpose:** Adds role-specific fields to support different user types
**Features:** Customer, mechanic, and admin specific fields with verification system

### 2. Vehicles Table
**File:** `0004_create_vehicles_table.sql`
**Purpose:** Stores customer vehicle information
**Relationship:** `users.id` → `vehicles.user_id` (one-to-many)

### 3. Shops Table
**File:** `0005_create_shops_table.sql`
**Purpose:** Mechanic shop details for Shops Locator
**Relationship:** `users.id` → `shops.owner_id` (one-to-one for mechanics)

### 4. Services Table
**File:** `0006_create_services_table.sql`
**Purpose:** Master list of service types and pricing
**Features:** Pre-populated with common services

### 5. Appointments Table
**File:** `0007_create_appointments_table.sql`
**Purpose:** Booking system connecting all users
**Relationships:** Links customers, mechanics, shops, vehicles, and services

### 5b. Add Vehicle Mechanic Policy
**File:** `0007_add_vehicle_mechanic_policy.sql`
**Purpose:** Add mechanic access to vehicles after appointments table exists
**Note:** Prevents circular dependency between vehicles and appointments

### 6. Service History Table
**File:** `0008_create_service_history_table.sql`
**Purpose:** Complete service records per vehicle
**Relationship:** `vehicles.id` → `service_history.vehicle_id` (one-to-many)

### 7. Reviews Table
**File:** `0009_create_reviews_table.sql`
**Purpose:** Customer ratings and feedback system
**Features:** Auto-updates shop ratings, multiple rating categories

### 8. Cost Insights Table
**File:** `0010_create_cost_insights_table.sql`
**Purpose:** Market pricing data for cost comparisons
**Features:** Location-based pricing insights with confidence levels

## How to Run Migrations

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query** to open the editor

### Step 2: Run Migrations in Order
Execute each migration file sequentially:

```sql
-- Copy and paste contents of:
-- 1. 0003_enhance_users_table.sql
-- 2. 0004_create_vehicles_table.sql
-- 3. 0005_create_shops_table.sql
-- 4. 0006_create_services_table.sql
-- 5. 0007_create_appointments_table.sql
-- 6. 0007_add_vehicle_mechanic_policy.sql
-- 7. 0008_create_service_history_table.sql
-- 8. 0009_create_reviews_table.sql
-- 9. 0010_create_cost_insights_table.sql
```

**Important:** Run each migration separately and wait for it to complete before running the next one.

## Database Relationships Overview

```
users (enhanced)
├── vehicles (customer vehicles)
│   └── service_history (service records)
├── shops (mechanic shops)
│   └── appointments (bookings)
├── appointments (booking system)
│   ├── vehicles
│   ├── shops
│   ├── services
│   └── reviews
├── reviews (ratings system)
└── cost_insights (market pricing - standalone)
```

## Feature Implementation Support

### Shops Locator
- Uses: `shops` table with location data
- Public access to verified shops via RLS policies
- Location-based queries with indexes

### Mechanic Matchmaking
- Uses: `shops`, `reviews`, `services`, `appointments`
- Rating system and specialization matching
- Availability and location filtering

### Service History Tracker
- Uses: `vehicles`, `service_history`, `appointments`
- Complete maintenance records per vehicle
- Cost tracking and warranty information

### Cost and Value Insights
- Uses: `cost_insights`, `services`, `service_history`
- Market pricing comparisons
- Location-based cost analysis

## Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Public read access for verified shops
- Admin access to all data
- Role-based permissions

### Data Integrity
- Foreign key constraints prevent orphaned records
- Check constraints validate data ranges
- Unique constraints prevent duplicates
- Cascade deletes maintain data consistency

## Performance Optimizations

### Indexes
- Location-based indexes for geo queries
- Composite indexes for common queries
- GIN indexes for array fields
- Partial indexes for filtered data

### Functions and Triggers
- Auto-update timestamps
- Shop rating calculations
- Cost insights lookup functions
- Data validation triggers

## Testing the Schema

After running migrations, verify:

1. **Users Table:** Check new columns exist
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public';
```

2. **Relationships:** Test foreign key constraints
```sql
SELECT COUNT(*) FROM vehicles WHERE user_id NOT IN (SELECT id FROM users);
```

3. **RLS Policies:** Verify permissions work correctly
```sql
SELECT * FROM pg_policies WHERE tablename = 'shops';
```

## Next Steps

1. Run all migrations in Supabase
2. Update backend models to use new tables
3. Implement API endpoints for new features
4. Update frontend components
5. Test the complete system

## Troubleshooting

- **Migration fails:** Check for syntax errors or existing constraints
- **RLS issues:** Verify policies are correctly defined
- **Performance issues:** Check if indexes are being used
- **Data integrity:** Verify foreign key relationships

For issues, check the Supabase logs and ensure migrations run in the correct order.
