-- Add mechanic access policy to vehicles table
-- This must run after appointments table is created to avoid circular dependency

-- Drop the note and add the actual policy
CREATE POLICY "Mechanics can read customer vehicles for appointments" ON vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.vehicle_id = vehicles.id
      AND a.mechanic_id = auth.uid()
    )
  );
