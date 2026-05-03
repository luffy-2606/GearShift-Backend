-- Create reviews table for customer ratings and feedback
-- Links customers, mechanics, shops, and appointments

CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  comment TEXT,
  is_recommended BOOLEAN DEFAULT true,
  would_return BOOLEAN DEFAULT true,
  price_reasonableness VARCHAR(20) DEFAULT 'fair' CHECK (price_reasonableness IN ('very_expensive', 'expensive', 'fair', 'reasonable', 'great_value')),
  service_speed VARCHAR(20) DEFAULT 'on_time' CHECK (service_speed IN ('very_slow', 'slow', 'on_time', 'fast', 'very_fast')),
  issue_resolution VARCHAR(20) DEFAULT 'resolved' CHECK (issue_resolution IN ('not_resolved', 'partially_resolved', 'resolved', 'exceeded_expectations')),
  photos TEXT[] DEFAULT '{}', -- Photos related to the review
  is_verified BOOLEAN DEFAULT false, -- Verified that the service actually occurred
  is_featured BOOLEAN DEFAULT false, -- Featured review for marketing
  response_from_mechanic TEXT, -- Mechanic's response to the review
  response_from_shop TEXT, -- Shop's response to the review
  response_date TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true,
  helpful_count INTEGER DEFAULT 0, -- Number of people who found this helpful
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_mechanic_id ON reviews(mechanic_id);
CREATE INDEX idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX idx_reviews_overall_rating ON reviews(overall_rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_is_public ON reviews(is_public);
CREATE INDEX idx_reviews_is_verified ON reviews(is_verified);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can read public verified reviews" ON reviews
  FOR SELECT USING (is_public = true AND is_verified = true);

CREATE POLICY "Customers can read own reviews" ON reviews
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Mechanics can read reviews about themselves" ON reviews
  FOR SELECT USING (mechanic_id = auth.uid());

CREATE POLICY "Shop owners can read shop reviews" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = reviews.shop_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create reviews for their appointments" ON reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND a.customer_id = auth.uid()
      AND a.status = 'completed'
    )
  );

CREATE POLICY "Customers can update own reviews" ON reviews
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Mechanics can respond to reviews about themselves" ON reviews
  FOR UPDATE USING (
    mechanic_id = auth.uid() AND
    (response_from_mechanic IS NOT NULL OR response_from_mechanic IS NULL)
  );

CREATE POLICY "Shop owners can respond to shop reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = reviews.shop_id
      AND s.owner_id = auth.uid()
    ) AND
    (response_from_shop IS NOT NULL OR response_from_shop IS NULL)
  );

CREATE POLICY "Admins can read all reviews" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update shop ratings when new review is added
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE shops 
    SET 
        average_rating = (
            SELECT COALESCE(AVG(overall_rating), 0) 
            FROM reviews 
            WHERE shop_id = NEW.shop_id 
            AND is_public = true 
            AND is_verified = true
        ),
        total_reviews = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE shop_id = NEW.shop_id 
            AND is_public = true 
            AND is_verified = true
        )
    WHERE id = NEW.shop_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update shop ratings
CREATE TRIGGER update_shop_rating_trigger
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_rating();
