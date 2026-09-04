-- Source: https://docs.fulcrumapp.com/reference/query-intro
-- Source: https://docs.fulcrumapp.com/reference/query-post
-- Purpose: read-only query shapes for Fulcrum's PostgreSQL/PostGIS backend.
--
-- The Query API is read-only. Every statement in this file is a SELECT, and no
-- statement here may be turned into an INSERT, UPDATE, DELETE, MERGE, TRUNCATE,
-- DROP, ALTER, CREATE, GRANT, or REVOKE.
--
-- There are no server-side bind parameters. The endpoint accepts one complete
-- SQL string in `q`, so the caller owns encoding. Allowlist discovered table and
-- column identifiers, and encode dynamic values with a reviewed, type-specific
-- SQL-literal encoder. If no suitable encoder exists, stop rather than
-- interpolating untrusted input. Placeholders below are written as :name and
-- must be replaced by encoded literals in caller code, not passed as binds.
--
-- Discover the current table catalog before naming a table. Table names come
-- from app names, so quote any name with spaces or special characters.

-- 1. Read a small sample from an app table.
SELECT *
FROM "My App Name"
LIMIT 10;

-- 2. Join a repeatable table to its parent records.
--    Repeatable tables carry _parent_id (immediate parent record) and
--    _record_id (root record, for nested repeatables).
SELECT
  p._record_id,
  p._status,
  r.some_repeatable_field
FROM "My App" p
JOIN "My App/my_repeatable" r
  ON r._parent_id = p._record_id
WHERE p._status = 'active';

-- 3. Spatial filter with PostGIS.
--    Cast to geography for metre-based distances.
SELECT _record_id, _latitude, _longitude
FROM "My App"
WHERE ST_DWithin(
  _geometry::geography,
  ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
  1000
);

-- 4. Common record metadata columns available on app tables.
SELECT
  _record_id,
  _status,
  _created_at,
  _updated_at,
  _created_by_id,
  _updated_by_id,
  _assigned_to_id,
  _project_id,
  _latitude,
  _longitude
FROM "My App"
ORDER BY _updated_at DESC
LIMIT 100;

-- 5. System table lookup. The current Query API source is authoritative for the
--    available system tables and their columns.
SELECT *
FROM forms
LIMIT 25;
