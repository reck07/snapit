-- Supabase Migration: Add user_id and ownership-scoped RLS policies
-- Run in Supabase Dashboard > SQL Editor

-- 1. Add user_id columns
ALTER TABLE products ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE service_logs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE reminders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill existing products to current test user
UPDATE products SET user_id = '0b42c129-a43e-4e94-a7b9-1a1112174fad' WHERE user_id IS NULL;

-- 3. Make user_id NOT NULL
ALTER TABLE products ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE service_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE reminders ALTER COLUMN user_id SET NOT NULL;

-- 4. Indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_user ON service_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

-- 5. Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;

-- 6. Drop old dev policies
DROP POLICY IF EXISTS "public read brands" ON brands;
DROP POLICY IF EXISTS "public write brands" ON brands;
DROP POLICY IF EXISTS "public read device_types" ON device_types;
DROP POLICY IF EXISTS "public write device_types" ON device_types;
DROP POLICY IF EXISTS "public read products" ON products;
DROP POLICY IF EXISTS "public write products" ON products;
DROP POLICY IF EXISTS "public read service_logs" ON service_logs;
DROP POLICY IF EXISTS "public write service_logs" ON service_logs;
DROP POLICY IF EXISTS "public read reminders" ON reminders;
DROP POLICY IF EXISTS "public write reminders" ON reminders;

-- 7. Create ownership-scoped policies
-- Reference tables: read-only to authenticated users (shared inventory)
CREATE POLICY "auth read brands" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read device_types" ON device_types FOR SELECT TO authenticated USING (true);

-- Products: users only access their own
CREATE POLICY "insert own products" ON products FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "read own products" ON products FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "update own products" ON products FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own products" ON products FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

-- Service logs
CREATE POLICY "insert own service_logs" ON service_logs FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "read own service_logs" ON service_logs FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "update own service_logs" ON service_logs FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own service_logs" ON service_logs FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

-- Reminders
CREATE POLICY "insert own reminders" ON reminders FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "read own reminders" ON reminders FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "update own reminders" ON reminders FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own reminders" ON reminders FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);