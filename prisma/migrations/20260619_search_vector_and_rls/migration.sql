-- ============================================
-- Search vector (Postgres FTS for VN-friendly product search)
-- ============================================

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Postgres unaccent() is STABLE, but generated columns require IMMUTABLE.
-- Wrap with an explicit dictionary reference + IMMUTABLE marker.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(name,''))), 'A') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(description,''))), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS "Product_searchVector_idx"
  ON "Product" USING GIN ("searchVector");

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN (name gin_trgm_ops);

-- ============================================
-- Order code sequence (per year, rotate annually)
-- ============================================

CREATE SEQUENCE IF NOT EXISTS order_code_seq_2026 START 1;

-- ============================================
-- Auth trigger: sync auth.users -> public."User"
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "avatarUrl", role, "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'USER',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    "avatarUrl" = COALESCE(EXCLUDED."avatarUrl", public."User"."avatarUrl"),
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_public();

-- ============================================
-- Row-Level Security policies
-- ============================================

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User: self read" ON "User";
DROP POLICY IF EXISTS "User: self update" ON "User";
CREATE POLICY "User: self read" ON "User"
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User: self update" ON "User"
  FOR UPDATE USING (auth.uid() = id);

-- Address
ALTER TABLE "Address" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Address: self all" ON "Address";
CREATE POLICY "Address: self all" ON "Address"
  FOR ALL USING (auth.uid() = "userId");

-- Order
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order: self read" ON "Order";
CREATE POLICY "Order: self read" ON "Order"
  FOR SELECT USING (auth.uid() = "userId");

-- OrderItem (joined via Order)
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "OrderItem: self read" ON "OrderItem";
CREATE POLICY "OrderItem: self read" ON "OrderItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Order" o
      WHERE o.id = "OrderItem"."orderId"
        AND o."userId" = auth.uid()
    )
  );

-- Catalog: public read for ACTIVE rows
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Product: public read active" ON "Product";
CREATE POLICY "Product: public read active" ON "Product"
  FOR SELECT USING (status = 'ACTIVE');

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Category: public read" ON "Category";
CREATE POLICY "Category: public read" ON "Category"
  FOR SELECT USING (true);

ALTER TABLE "ProductImage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ProductImage: public read" ON "ProductImage";
CREATE POLICY "ProductImage: public read" ON "ProductImage"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "ProductImage"."productId"
        AND p.status = 'ACTIVE'
    )
  );

ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ProductVariant: public read" ON "ProductVariant";
CREATE POLICY "ProductVariant: public read" ON "ProductVariant"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Product" p
      WHERE p.id = "ProductVariant"."productId"
        AND p.status = 'ACTIVE'
    )
  );

-- InventoryLog: admin-only (no client policy; service role bypasses RLS)
ALTER TABLE "InventoryLog" ENABLE ROW LEVEL SECURITY;
-- (No policy = no client access; only service-role can read/write)
