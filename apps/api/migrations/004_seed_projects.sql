-- ProjectWatch Rwanda — Phase 3: Seed 5 example pilot projects.
-- Idempotent — skips if projects already exist.
-- Coordinates approximate real Rwandan road corridors.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO projects (id, name, description, boundary, timeline_start, timeline_end, milestones, created_at, updated_at)
  VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Kigali–Bugesera Highway',
    'Dual carriageway connecting Kigali to Bugesera International Airport. Phase 1: 28 km.',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[30.05,-1.95],[30.18,-1.95],[30.18,-2.05],[30.05,-2.05],[30.05,-1.95]]]}'),
    '2026-01-15T00:00:00Z', '2027-08-30T00:00:00Z',
    '[{"name":"Land acquisition","plannedDate":"2026-03-01T00:00:00Z","status":"done"},{"name":"Clearing & grubbing","plannedDate":"2026-05-01T00:00:00Z","status":"done"},{"name":"Earthworks","plannedDate":"2026-09-01T00:00:00Z","status":"in_progress"},{"name":"Base layer","plannedDate":"2027-01-15T00:00:00Z","status":"pending"},{"name":"Asphalt paving","plannedDate":"2027-05-01T00:00:00Z","status":"pending"},{"name":"Completion","plannedDate":"2027-08-30T00:00:00Z","status":"pending"}]'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Musanze–Rubavu Corridor',
    'Rehabilitation of the RN18 connecting Musanze (Ruhengeri) to Rubavu (Gisenyi). 42 km.',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.35,-1.50],[29.55,-1.50],[29.55,-1.70],[29.35,-1.70],[29.35,-1.50]]]}'),
    '2026-03-01T00:00:00Z', '2027-12-15T00:00:00Z',
    '[{"name":"Feasibility & design","plannedDate":"2026-05-01T00:00:00Z","status":"done"},{"name":"Utility relocation","plannedDate":"2026-08-01T00:00:00Z","status":"in_progress"},{"name":"Drainage structures","plannedDate":"2027-02-01T00:00:00Z","status":"pending"},{"name":"Road base","plannedDate":"2027-06-01T00:00:00Z","status":"pending"},{"name":"Surfacing","plannedDate":"2027-09-01T00:00:00Z","status":"pending"},{"name":"Completion","plannedDate":"2027-12-15T00:00:00Z","status":"pending"}]'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Kigali Urban Ring Road',
    'Upgrading the inner ring road in Kigali (KG 15 Ave corridor), including junctions and pedestrian walkways. 12 km.',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[30.05,-1.92],[30.12,-1.92],[30.12,-1.98],[30.05,-1.98],[30.05,-1.92]]]}'),
    '2026-06-01T00:00:00Z', '2027-10-31T00:00:00Z',
    '[{"name":"Traffic study","plannedDate":"2026-07-15T00:00:00Z","status":"done"},{"name":"Detailed engineering","plannedDate":"2026-10-01T00:00:00Z","status":"done"},{"name":"Utility relocation","plannedDate":"2027-01-01T00:00:00Z","status":"pending"},{"name":"Road widening","plannedDate":"2027-04-01T00:00:00Z","status":"pending"},{"name":"Walkways & lighting","plannedDate":"2027-08-01T00:00:00Z","status":"pending"},{"name":"Completion","plannedDate":"2027-10-31T00:00:00Z","status":"pending"}]'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'Huye–Nyamagabe Road',
    'Gravel-to-paved upgrade on the RN66 through the southern highlands. 38 km.',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[29.68,-2.55],[29.82,-2.55],[29.82,-2.70],[29.68,-2.70],[29.68,-2.55]]]}'),
    '2025-09-01T00:00:00Z', '2027-03-31T00:00:00Z',
    '[{"name":"Design review","plannedDate":"2025-11-01T00:00:00Z","status":"done"},{"name":"Clearing","plannedDate":"2026-01-15T00:00:00Z","status":"done"},{"name":"Earthworks","plannedDate":"2026-05-01T00:00:00Z","status":"done"},{"name":"Base course","plannedDate":"2026-09-01T00:00:00Z","status":"done"},{"name":"Paving","plannedDate":"2027-01-01T00:00:00Z","status":"in_progress"},{"name":"Completion","plannedDate":"2027-03-31T00:00:00Z","status":"pending"}]'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'Rusumo–Kirehe Border Road',
    'Connecting the Rusumo hydroelectric area to Kirehe district along the Tanzanian border. 55 km.',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[30.55,-2.38],[30.78,-2.38],[30.78,-2.52],[30.55,-2.52],[30.55,-2.38]]]}'),
    '2026-08-01T00:00:00Z', '2028-06-30T00:00:00Z',
    '[{"name":"Environmental impact","plannedDate":"2026-10-01T00:00:00Z","status":"done"},{"name":"Route survey","plannedDate":"2027-01-15T00:00:00Z","status":"in_progress"},{"name":"Bridge design","plannedDate":"2027-05-01T00:00:00Z","status":"pending"},{"name":"Road formation","plannedDate":"2027-09-01T00:00:00Z","status":"pending"},{"name":"Gravel surfacing","plannedDate":"2028-02-01T00:00:00Z","status":"pending"},{"name":"Completion","plannedDate":"2028-06-30T00:00:00Z","status":"pending"}]'::jsonb,
    now(), now()
  );
END $$;
