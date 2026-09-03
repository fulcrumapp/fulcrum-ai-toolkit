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
   `scripts/openapi_example_contracts.rb`, naming its exact component schema.
2. If a JSON example intentionally is not REST API shaped, add it to
   `NON_OPENAPI_JSON` with a specific, durable explanation. Never exclude a file
   merely to make validation pass.
3. Run `ruby scripts/validate_openapi_examples.rb`.
4. Run `ruby test/openapi_example_contracts_test.rb` after changing validator
   behavior, mappings, exclusions, or the vendored schema.

The validator treats documented OpenAPI properties as a closed set for example
files. This catches misspelled or retired properties even where the source
schema does not declare `additionalProperties: false`. Unmapped JSON examples
fail inventory validation so new examples cannot silently bypass this check.

## References

- [Fulcrum REST API OpenAPI source](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
