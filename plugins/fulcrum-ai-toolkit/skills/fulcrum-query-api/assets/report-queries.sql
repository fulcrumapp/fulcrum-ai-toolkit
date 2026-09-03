-- Source: https://docs.fulcrumapp.com/docs/functions#query
-- Source: https://docs.fulcrumapp.com/reference/query-intro
-- Purpose: the read-only SQL shapes a Report Template passes to QUERY().
--
-- These statements are SELECT-only. A report renders output; it must never
-- issue INSERT, UPDATE, DELETE, MERGE, TRUNCATE, DROP, ALTER, CREATE, GRANT, or
-- REVOKE. The Query API would reject a write, and a template that attempts one
-- is a defect.
--
-- The endpoint has no server-side bind parameters. Encode or allowlist every
-- interpolated value in the template before it reaches QUERY(). The :name
-- placeholders below stand for encoded literals, not binds. See
-- ../../fulcrum-report-building/examples/sanitize-params-for-sql.ejs.

-- Related records for the current record's site.
SELECT inspector_name, inspection_date, status
FROM "Site Inspections"
WHERE site_id = :site_id
ORDER BY _created_at DESC
LIMIT 100;

-- Repeatable line items for the current record.
SELECT r.*
FROM "Work Orders/line_items" r
WHERE r._parent_id = :record_id;

-- A bounded date-range report driven by validated $params values.
SELECT *
FROM "Inspections"
WHERE _created_at BETWEEN :start_date AND :end_date
ORDER BY _created_at DESC
LIMIT 500;
