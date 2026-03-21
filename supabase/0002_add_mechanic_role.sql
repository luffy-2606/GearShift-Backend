-- Add 'mechanic' to the allowed roles for the users table.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('user', 'mechanic', 'admin'));
