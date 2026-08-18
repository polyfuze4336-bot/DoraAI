BEGIN;

CREATE TABLE IF NOT EXISTS manufacturing_status (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site text NOT NULL,
  region text NOT NULL,
  product text NOT NULL,
  capacity double precision NOT NULL CHECK (capacity >= 0),
  utilization double precision NOT NULL CHECK (utilization BETWEEN 0 AND 1),
  planned_output double precision NOT NULL CHECK (planned_output >= 0),
  actual_output double precision NOT NULL CHECK (actual_output >= 0),
  downtime_hours double precision NOT NULL CHECK (downtime_hours >= 0),
  inventory double precision NOT NULL CHECK (inventory >= 0),
  feedstock_availability double precision NOT NULL CHECK (feedstock_availability BETWEEN 0 AND 1),
  demand_indicator double precision NOT NULL CHECK (demand_indicator BETWEEN 0 AND 1),
  status text NOT NULL CHECK (status IN ('normal','constrained','disrupted','maintenance')),
  observed_at timestamptz NOT NULL,
  data_origin text NOT NULL CHECK (data_origin IN ('internal','seeded-demo')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site, product, observed_at)
);

CREATE INDEX IF NOT EXISTS ix_manufacturing_region_observed
  ON manufacturing_status (region, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_manufacturing_site_observed
  ON manufacturing_status (site, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_manufacturing_status_observed
  ON manufacturing_status (status, observed_at DESC);

INSERT INTO manufacturing_status (
  site, region, product, capacity, utilization, planned_output, actual_output,
  downtime_hours, inventory, feedstock_availability, demand_indicator, status,
  observed_at, data_origin
) VALUES
  ('Rotterdam Compounds', 'Europe', 'Engineering polymers', 1200, 0.88, 980, 952, 4, 410, 0.82, 0.71, 'normal', '2026-08-17T06:00:00Z', 'seeded-demo'),
  ('Texas Olefins', 'North America', 'Ethylene', 1800, 0.72, 1420, 1295, 18, 365, 0.61, 0.68, 'constrained', '2026-08-17T06:00:00Z', 'seeded-demo'),
  ('Jurong Specialties', 'Asia Pacific', 'Specialty chemicals', 900, 0.81, 710, 726, 2, 288, 0.76, 0.74, 'normal', '2026-08-17T06:00:00Z', 'seeded-demo'),
  ('Antwerp Resins', 'Europe', 'Polyethylene', 1350, 0.63, 1020, 842, 31, 502, 0.54, 0.46, 'maintenance', '2026-08-17T06:00:00Z', 'seeded-demo'),
  ('Pune Formulations', 'Asia Pacific', 'Industrial coatings', 650, 0.91, 540, 558, 0, 192, 0.88, 0.79, 'normal', '2026-08-17T06:00:00Z', 'seeded-demo'),
  ('Santos Blending', 'South America', 'Fuel additives', 520, 0.57, 430, 350, 26, 148, 0.48, 0.52, 'disrupted', '2026-08-17T06:00:00Z', 'seeded-demo')
ON CONFLICT (site, product, observed_at) DO NOTHING;

COMMIT;