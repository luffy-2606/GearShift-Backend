-- Create cost_insights table for market pricing data
-- Provides cost insights for different services across locations

CREATE TABLE cost_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type VARCHAR(200) NOT NULL,
  service_category VARCHAR(100),
  location_type VARCHAR(50) DEFAULT 'city' CHECK (location_type IN ('national', 'state', 'city', 'zip_code')),
  location_name VARCHAR(200) NOT NULL, -- e.g., "California", "Los Angeles", "90210"
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  avg_cost DECIMAL(10,2) CHECK (avg_cost >= 0),
  min_cost DECIMAL(10,2) CHECK (min_cost >= 0),
  max_cost DECIMAL(10,2) CHECK (max_cost >= min_cost),
  median_cost DECIMAL(10,2) CHECK (median_cost >= 0),
  std_deviation DECIMAL(10,2) CHECK (std_deviation >= 0),
  data_points_count INTEGER DEFAULT 0 CHECK (data_points_count >= 0),
  price_per_hour DECIMAL(10,2), -- Average labor cost per hour
  parts_cost_percentage DECIMAL(5,2), -- Average percentage of cost that goes to parts
  labor_cost_percentage DECIMAL(5,2), -- Average percentage of cost that goes to labor
  tax_cost_percentage DECIMAL(5,2), -- Average percentage of cost that goes to tax
  seasonality_factor DECIMAL(3,2) DEFAULT 1.00, -- Seasonal price multiplier
  economic_factor DECIMAL(3,2) DEFAULT 1.00, -- Economic condition multiplier
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_collection_period_start DATE,
  data_collection_period_end DATE,
  confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  source_notes TEXT, -- Notes about data sources and methodology
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cost_insights_service_type ON cost_insights(service_type);
CREATE INDEX idx_cost_insights_service_category ON cost_insights(service_category);
CREATE INDEX idx_cost_insights_location ON cost_insights(location_type, location_name);
CREATE INDEX idx_cost_insights_avg_cost ON cost_insights(avg_cost);
CREATE INDEX idx_cost_insights_last_updated ON cost_insights(last_updated DESC);
CREATE INDEX idx_cost_insights_confidence ON cost_insights(confidence_level);

-- Enable RLS
ALTER TABLE cost_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Cost insights are generally public read-only
CREATE POLICY "Public can read cost insights" ON cost_insights
  FOR SELECT USING (confidence_level IN ('medium', 'high'));

CREATE POLICY "Admins can read all cost insights" ON cost_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert cost insights" ON cost_insights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update cost insights" ON cost_insights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete cost insights" ON cost_insights
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to get cost insights for a specific service and location
CREATE OR REPLACE FUNCTION get_cost_insights(
  p_service_type VARCHAR(200),
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_radius_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  service_type VARCHAR(200),
  location_name VARCHAR(200),
  avg_cost DECIMAL(10,2),
  min_cost DECIMAL(10,2),
  max_cost DECIMAL(10,2),
  median_cost DECIMAL(10,2),
  data_points_count INTEGER,
  confidence_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.service_type,
        ci.location_name,
        ci.avg_cost,
        ci.min_cost,
        ci.max_cost,
        ci.median_cost,
        ci.data_points_count,
        ci.confidence_level
    FROM cost_insights ci
    WHERE ci.service_type = p_service_type
    AND ci.confidence_level IN ('medium', 'high')
    AND (
        -- Exact location match
        (ci.location_type = 'city' AND ci.latitude IS NOT NULL AND ci.longitude IS NOT NULL AND
         -- Simple distance calculation (in production, use PostGIS)
         ABS(ci.latitude - p_latitude) <= 0.5 AND 
         ABS(ci.longitude - p_longitude) <= 0.5)
        OR
        -- State/national level fallback
        ci.location_type IN ('state', 'national')
    )
    ORDER BY 
        CASE 
            WHEN ci.location_type = 'city' THEN 1
            WHEN ci.location_type = 'state' THEN 2
            WHEN ci.location_type = 'national' THEN 3
        END,
        ci.data_points_count DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;
