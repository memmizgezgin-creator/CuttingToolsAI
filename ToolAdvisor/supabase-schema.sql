-- ============================================================
-- ToolAdvisor — Supabase Schema
-- Run in Supabase SQL Editor (Settings → SQL)
-- ============================================================

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                     TEXT PRIMARY KEY,
  brand                  TEXT NOT NULL,
  product_name           TEXT,
  series                 TEXT,
  product_type           TEXT DEFAULT 'insert',
  grade                  TEXT,
  coating                TEXT,
  geometry               TEXT,
  iso_codes              TEXT[]   DEFAULT '{}',
  operations             TEXT[]   DEFAULT '{}',
  materials              TEXT[]   DEFAULT '{}',
  vc_range               TEXT,
  fn_range               TEXT,
  ap_range               TEXT,
  tool_life              TEXT,
  application_notes      TEXT,
  top_for                TEXT[]   DEFAULT '{}',
  exact_equivalents      TEXT[]   DEFAULT '{}',
  functional_alternatives TEXT[]  DEFAULT '{}',
  value_alternatives     TEXT[]   DEFAULT '{}',
  cutting_data           JSONB    DEFAULT '{}',
  buy_links              JSONB    DEFAULT '[]',
  image_url              TEXT     DEFAULT '',
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CROSS REFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS cross_references (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  insert_code      TEXT    NOT NULL,   -- lookup key  (e.g. CNMG120408)
  ref_desc         TEXT,               -- group description
  brand            TEXT,
  equivalent_code  TEXT,
  coating          TEXT,
  application      TEXT,
  apc_class        TEXT,               -- rtag-p / rtag-m / rtag-k … (CSS color class)
  sort_order       INT     DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRACKER EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tracker_events (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp    TIMESTAMPTZ DEFAULT NOW(),
  event_type   TEXT,
  event_data   JSONB,
  session_id   TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_references  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_events    ENABLE ROW LEVEL SECURITY;

-- products: public read, no client write
CREATE POLICY "products_public_read"
  ON products FOR SELECT USING (true);

-- cross_references: public read
CREATE POLICY "cross_references_public_read"
  ON cross_references FOR SELECT USING (true);

-- tracker_events: anonymous insert only — no read, no update, no delete
CREATE POLICY "tracker_events_anon_insert"
  ON tracker_events FOR INSERT WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
-- Products
CREATE INDEX IF NOT EXISTS idx_products_brand
  ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_operations
  ON products USING GIN(operations);
CREATE INDEX IF NOT EXISTS idx_products_materials
  ON products USING GIN(materials);
CREATE INDEX IF NOT EXISTS idx_products_product_type
  ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_top_for
  ON products USING GIN(top_for);

-- Cross references
CREATE INDEX IF NOT EXISTS idx_crossref_insert_code
  ON cross_references(insert_code);
CREATE INDEX IF NOT EXISTS idx_crossref_brand
  ON cross_references(brand);

-- Tracker
CREATE INDEX IF NOT EXISTS idx_tracker_session
  ON tracker_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracker_type
  ON tracker_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracker_ts
  ON tracker_events(timestamp DESC);

-- ============================================================
-- ANALYTICS VIEW (optional — useful for Supabase dashboard)
-- ============================================================
CREATE OR REPLACE VIEW event_summary AS
  SELECT
    event_type,
    COUNT(*)                                          AS total,
    COUNT(DISTINCT session_id)                        AS unique_sessions,
    MAX(timestamp)                                    AS last_seen
  FROM tracker_events
  GROUP BY event_type
  ORDER BY total DESC;
