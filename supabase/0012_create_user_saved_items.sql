-- User favorites / bookmarks: cross-device synced saved items (shops, mechanics, quotes, etc.)

CREATE TABLE user_saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN (
    'shop',
    'mechanic',
    'appointment',
    'cost_insight',
    'quote_snapshot',
    'parts_bundle'
  )),
  entity_id UUID,
  snapshot JSONB NOT NULL DEFAULT '{}',
  title VARCHAR(255),
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_saved_items_user_id ON user_saved_items(user_id);
CREATE INDEX idx_user_saved_items_user_updated ON user_saved_items(user_id, updated_at DESC);
CREATE INDEX idx_user_saved_items_tags ON user_saved_items USING GIN(tags);
CREATE INDEX idx_user_saved_items_entity ON user_saved_items(entity_type, entity_id);

CREATE UNIQUE INDEX idx_user_saved_items_unique_target
  ON user_saved_items(user_id, entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

ALTER TABLE user_saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved items" ON user_saved_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved items" ON user_saved_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved items" ON user_saved_items
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own saved items" ON user_saved_items
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can read all saved items" ON user_saved_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE TRIGGER update_user_saved_items_updated_at
  BEFORE UPDATE ON user_saved_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_saved_items IS 'Polymorphic bookmarks: shops, mechanics, appointments, cost insights, quote snapshots, part bundles.';
