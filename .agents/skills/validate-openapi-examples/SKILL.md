---
name: validate-openapi-examples
description: Validate JSON examples and assets against the vendored Fulcrum REST API OpenAPI component schemas.
---

# Validate OpenAPI Examples

Use this skill whenever adding or changing JSON under a toolkit skill's
`examples/` or `assets/` directory, or when updating the vendored Fulcrum REST
API OpenAPI document.

## Workflow

1. Add each OpenAPI-shaped JSON file to `SCHEMA_MAPPINGS` in
   `tools/format-validator/lib/schema-contract.mjs`, naming its exact component schema.
2. If a JSON example intentionally is not REST API shaped, add it to
   `NON_OPENAPI_JSON` in `tools/format-validator/lib/schema-contract.mjs` with a
   specific, durable explanation. Never exclude a file merely to make validation pass.
3. Run `npm run validate` in `tools/format-validator`.

The validator treats documented OpenAPI properties as a closed set for example
files. This catches misspelled or retired properties even where the source
schema does not declare `additionalProperties: false`. Unmapped JSON examples
fail inventory validation so new examples cannot silently bypass this check.

## References

- [Fulcrum REST API OpenAPI source](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
