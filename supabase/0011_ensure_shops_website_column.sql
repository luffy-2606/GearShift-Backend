-- Workshops website URLs for listings and AI context.
-- Already defined in 0005_create_shops_table.sql for new installs; this is safe if that migration predates your DB.

ALTER TABLE shops ADD COLUMN IF NOT EXISTS website VARCHAR(500);

COMMENT ON COLUMN shops.website IS 'Public workshop website URL (https recommended).';
