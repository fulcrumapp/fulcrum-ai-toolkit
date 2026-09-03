# Report Example Index

Report Template fragments for the Fulcrum Report Builder runtime. Each file
carries an `<%# Source: %>` or `/* Source: */` comment naming its public
documentation. Paste a fragment into a template; these are not standalone
templates.

Only functions listed in
[`report-template-reference.md`](../resources/report-template-reference.md)
exist at runtime. Do not invent helper names, and never place a credential in a
template.

## Reading the record

| File | What it shows |
| --- | --- |
| [`record-field-access.ejs`](record-field-access.ejs) | `record.formValues.find()` with `value` and `displayValue`. |
| [`repeatable-table-rows.ejs`](repeatable-table-rows.ejs) | Iterating a repeatable through `items`. |
| [`conditional-section.ejs`](conditional-section.ejs) | Branching on a stored choice `value`. |
| [`photo-url-signed-src.ejs`](photo-url-signed-src.ejs) | `PHOTOURL()` for a usable image `src`. |

## Going beyond one record

| File | What it shows |
| --- | --- |
| [`query-related-records.ejs`](query-related-records.ejs) | `QUERY(sql, options)` and reading `rows`. |
| [`query-rows-iteration.ejs`](query-rows-iteration.ejs) | The minimal `rows` iteration form. |
| [`query-repeatable-join.ejs`](query-repeatable-join.ejs) | Joining a repeatable table on `_parent_id`. |
| [`api-fulcrum-rest.ejs`](api-fulcrum-rest.ejs) | `API(path, options)` for Fulcrum REST resources. |

## Parameterized and HTML reports

| File | What it shows |
| --- | --- |
| [`params-date-range.ejs`](params-date-range.ejs) | Validating `$params` before use. |
| [`html-filter-form.ejs`](html-filter-form.ejs) | An HTML report that re-submits to its own URL. |
| [`sanitize-params-for-sql.ejs`](sanitize-params-for-sql.ejs) | Encoding a parameter before interpolation. |

## Assets

| File | What it holds |
| --- | --- |
| [`ejs-tag-types.ejs`](../assets/ejs-tag-types.ejs) | The three EJS tag forms. |
| [`report-print-layout.css`](../assets/report-print-layout.css) | A starting print stylesheet with page-break control. |
| [`report-queries.sql`](../../fulcrum-query-api/assets/report-queries.sql) | Read-only SQL shapes used by report queries. |

## SQL safety

The Query API is read-only and accepts one complete SQL string with no
server-side bind parameters. Encode or allowlist every interpolated value in
the template before it reaches `QUERY()`. Never write a statement that mutates
data; a report template has no business issuing one.
