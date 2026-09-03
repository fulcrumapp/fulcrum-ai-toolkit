# Fulcrum AI Toolkit

Portable AI skills for building apps, data events, reports, integrations,
mapping, queries, access models, and migrations on the
[Fulcrum](https://www.fulcrumapp.com) platform.

Built around the open [Agent Skills standard](https://agentskills.io/specification) — skills are portable Markdown workflows with structured metadata that compatible AI agents load on demand.

## Install

This repository is a marketplace containing the distributable
`plugins/fulcrum-ai-toolkit/` package.

In Claude Code, add the marketplace and install the plugin:

```bash
/plugin marketplace add https://github.com/fulcrumapp/fulcrum-ai-toolkit.git
/plugin install fulcrum-ai-toolkit@fulcrum-ai-toolkit
```

In Codex, add the repository marketplace, then install
`fulcrum-ai-toolkit` from the Plugins directory:

```bash
codex plugin marketplace add fulcrumapp/fulcrum-ai-toolkit
codex plugin install fulcrum-ai-toolkit@fulcrum-ai-toolkit
```

In GitHub Copilot CLI, add the marketplace and install the plugin:

```bash
copilot plugin marketplace add fulcrumapp/fulcrum-ai-toolkit
copilot plugin install fulcrum-ai-toolkit@fulcrum-ai-toolkit
```

For a standalone skills loader, target the packaged skills directory:

```bash
npx skills@latest add https://github.com/fulcrumapp/fulcrum-ai-toolkit/tree/main/plugins/fulcrum-ai-toolkit/skills
```

You can also copy or symlink individual skill directories from
`plugins/fulcrum-ai-toolkit/skills/` into a host's documented project skill
directory. `.agents/` is reserved for repository-scoped agent assets and
marketplace metadata.

The toolkit installs guidance skills only. It does not include Fulcrum App MCP
or Fulcrum credentials. When separately registered, App MCP is the toolkit's
default control plane for supported app configuration and knowledge operations.
Without it, `fulcrum-app-builder` stops at an approved implementation handoff.
App MCP covers forms, schema builders and validation, choices, classifications,
projects, layer metadata, webhooks, Reference Files, memberships and roles,
Report Templates, and report generation. Query API execution, record CRUD, and
media CRUD require another authorized interface.

Live installed App MCP schemas define the connector tool contract and take
precedence over toolkit prose.

## Start here

1. Run `fulcrum-discovery` for a new workflow.
2. Define the goal and deliverable with `fulcrum-app-goal`.
3. Use `fulcrum-app-builder` and `fulcrum-app-design` to propose and approve a schema.
4. Route integration, mapping, Query API, access, and migration decisions to
   their focused skills.
5. Build through Fulcrum App MCP when available, or use the approved handoff.
6. Test the workflow and document the result with `fulcrum-solution-document`.

## Alpha install matrix

The distributable package uses the portable
`plugins/fulcrum-ai-toolkit/skills/*/SKILL.md` layout. Host-specific manifests
are adapters inside that package and either discover the standard `skills/`
directory or explicitly point to it when the host contract supports that field.

| Host | Install path | Skills | Live Fulcrum actions | Alpha status |
| --- | --- | --- | --- | --- |
| Generic skills loader | Add `plugins/fulcrum-ai-toolkit/skills/` | Yes | No, connector required | Target |
| Claude Code | Add the Claude marketplace, then install the plugin | Yes | Connector-dependent | Target |
| Cursor | Install `plugins/fulcrum-ai-toolkit/` as a plugin | Yes | Connector-dependent | Target |
| Codex | Add the repository marketplace, then install the plugin | Yes | Connector-dependent | Target |
| GitHub Copilot | Add this marketplace, then install the plugin | Yes | Connector-dependent | Target |
| Gemini | Install `plugins/fulcrum-ai-toolkit/` as an extension | Verify | Connector-dependent | Verify |
| Hermes | Install `plugins/fulcrum-ai-toolkit/` as a plugin | Yes | Connector-dependent | Verify |
| Claude Desktop | Copy `plugins/fulcrum-ai-toolkit/skills/` to the consuming repo and configure MCP separately | Yes | MCP-dependent | Later |

The `Target` and `Verify` labels describe the toolkit's intended alpha support,
not a claim that every host has been tested in this repository yet.

## Local validation

Ruby 3.2.11 is required; compatible version managers can provision it from
`.ruby-version`. Run the Ruby checks from the repository root:

```bash
ruby scripts/validate.rb
ruby test/app_mcp_contract_test.rb
ruby test/manifest_contract_test.rb
ruby test/product_knowledge_decomposition_test.rb
ruby test/external_examples_test.rb
ruby test/smoke_test.rb
```

Structural format validation for the externalized examples and assets lives in
`tools/format-validator`, a small Node package whose parsers are pinned exactly
in `package.json` and `package-lock.json`. Install once, then run it directly
or let the external examples test invoke it:

```bash
npm ci --prefix tools/format-validator
npm run --prefix tools/format-validator validate
```

The Ruby checks are dependency-free and run without Node; only the structural
format pass needs the pinned package, and CI sets `REQUIRE_NODE=1` so it can
never be skipped there.

The validator checks the exact 16-skill inventory, skill frontmatter,
directory/name consistency, corporate absolute paths, possible credentials,
JSON manifests, and README inventory.
The contract test prevents regressions in App MCP tool names, signatures, and
preservation-safe form updates. The decomposition test checks focused skill
discovery, sources, router/coverage links, and package boundaries. The external
examples test proves that no fenced code block remains in skill Markdown, that
every `examples/` and `assets/` file is indexed and reachable, that each one
names a public source URL, that no example, asset, or index carries credential
or private material, that every effective SQL statement is read-only, and that
the legacy and current example inventories match
`test/data/example-block-inventory.json` exactly, identifier by identifier. The
format validator parses HTML structure and its inline scripts and styles,
compiles EJS, and parses CSS, PostgreSQL, JSON, and JavaScript; files that are
not whole documents are labeled `Fragment:` and validated as such. The smoke
test exercises a small site-inspection workflow through discovery, schema
approval, offline review, and the no-MCP handoff path.

## Skills

| Skill | Description | Type |
| ------- | ------------- | ------ |
| `fulcrum-product-knowledge` | Fulcrum platform capability router, constraints, plans, boundaries, and App MCP build reference | Model-invoked |
| `fulcrum-integration-patterns` | Workflow and integration selection, webhooks, URL Actions, REST, middleware, and delivery safety | Model-invoked |
| `fulcrum-gis-mapping` | GIS/layer selection, online/offline mapping, geometry, and import/export boundaries | Model-invoked |
| `fulcrum-query-api` | Read-only Query API modeling, metadata discovery, safe SQL parameters, and spatial-query boundaries | Model-invoked |
| `fulcrum-access-management` | Roles, resource access, memberships, SSO/SCIM, and least-privilege reasoning | Model-invoked |
| `fulcrum-data-migration` | Supported migration assessment, mapping, dry runs, reconciliation, cutover, and rollback design | Model-invoked |
| `fulcrum-app-builder` | Novice-friendly app discovery, schema approval, App MCP orchestration, and connector-independent handoff | Model-invoked |
| `fulcrum-app-design` | App structure, field types, linked apps vs single app, repeatables | Model-invoked |
| `fulcrum-app-goal` | Ensure every app has a clear goal and defined deliverable | Model-invoked |
| `fulcrum-safety` | Flag missing safety steps in field workflows | Model-invoked |
| `fulcrum-data-events` | Data event patterns, anti-patterns, and platform constraints | Model-invoked |
| `fulcrum-workflow-decomposition` | Break monolithic apps into composable, maintainable pieces | Model-invoked |
| `fulcrum-app-extensions` | App extension anatomy, FS bridge API, offline support, picker anti-pattern | Model-invoked |
| `fulcrum-report-building` | Report template authoring — EJS tags, repeatables, parameters, debugging | Model-invoked |
| `fulcrum-discovery` | Process discovery before building — interview the customer | User-invoked |
| `fulcrum-solution-document` | Post-build documentation, privacy review, and destination-neutral sharing formats | User-invoked |

## Usage

Skills are **model-invoked** by default: the agent fires them automatically when building Fulcrum apps. The agent will:

- Use the platform router for capability, plan, public AI, offline, and App MCP
  boundary decisions (`fulcrum-product-knowledge`)
- Select Workflows, webhooks, URL Actions, REST, and middleware safely
  (`fulcrum-integration-patterns`)
- Verify current GIS, layer, geometry, and online/offline mapping support
  (`fulcrum-gis-mapping`)
- Model read-only SQL from discovered Query API metadata
  (`fulcrum-query-api`)
- Design role plus resource access and SSO/SCIM lifecycle controls
  (`fulcrum-access-management`)
- Plan supported migrations with dry-run, reconciliation, and rollback evidence
  (`fulcrum-data-migration`)
- Guide app discovery, schema approval, and App MCP-dependent execution (`fulcrum-app-builder`)
- Check that every app has a clear goal before building (`fulcrum-app-goal`)
- Select appropriate field types and app structure (`fulcrum-app-design`)
- Flag missing safety steps in field workflows (`fulcrum-safety`)
- Apply data event best practices and avoid anti-patterns (`fulcrum-data-events`)
- Recommend decomposition when apps grow too complex (`fulcrum-workflow-decomposition`)
- Apply extension best practices and avoid the picker anti-pattern (`fulcrum-app-extensions`)
- Guide report template authoring with correct EJS patterns and parameter handling (`fulcrum-report-building`)

Two skills are **user-invoked** — run them manually:

- `fulcrum-discovery` — start a new project by interviewing the customer before building
- `fulcrum-solution-document` — after building, document what was built, review it for privacy, and prepare it for a destination chosen by the user

## Where this comes from

The toolkit combines public Fulcrum documentation with portable workflow
guidance. Live App MCP schemas own connector names, arguments, and result
shapes; public Fulcrum documentation owns product and runtime behavior.

Distributable provenance uses `> Source:` notes with a public URL. The legacy
coverage manifest may instead use its neutral `Inventory fingerprint:` label.
Named people, customers, and non-public research attribution are not valid
public
provenance. Validation enforces these structural cues across packaged text,
including dotfiles; it is not a general-purpose personal-data detector.

The five layer-3 product skills prohibit any triple-backtick or triple-tilde
token anywhere in a packaged regular file. This intentionally simple rule is
stricter than Markdown fence parsing; later layers own executable examples and
their durable externalization policy.

### Sources

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/) for public
  platform behavior and runtime functions.
- [Fulcrum public OpenAPI document](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
  for REST resource shapes.
- Live installed App MCP schemas for the connector control-plane contract used
  by the current workflow guidance.

The [legacy product-knowledge migration coverage map](plugins/fulcrum-ai-toolkit/docs/legacy-product-knowledge-coverage.md)
tracks every legacy domain, its canonical target, public sources, and material
that must remain private or be dropped.

### Skill format

Skills follow the [Agent Skills specification](https://agentskills.io/specification):
each distributable skill under `plugins/fulcrum-ai-toolkit/skills/` is a
directory containing a `SKILL.md` with YAML frontmatter (`name` and
`description`) plus a Markdown body. The optional invocation fields are
retained where supported by a host and ignored elsewhere.

### Platform support

Plugin configs are included for multiple AI platforms:

| Platform | Config |
| ---------- | -------- |
| GitHub Copilot CLI | `.github/plugin/marketplace.json` and `plugins/fulcrum-ai-toolkit/plugin.json` |
| Claude Code | `plugins/fulcrum-ai-toolkit/.claude-plugin/plugin.json` |
| Cursor | `plugins/fulcrum-ai-toolkit/.cursor-plugin/plugin.json` |
| Codex | `plugins/fulcrum-ai-toolkit/.codex-plugin/plugin.json` |
| Hermes | `plugins/fulcrum-ai-toolkit/.hermes-plugin/` |
| Gemini | `plugins/fulcrum-ai-toolkit/gemini-extension.json` |
| MCP | `plugins/fulcrum-ai-toolkit/.mcp.json` |

All hosts discover or reference the package's shared `skills/` directory; they
do not maintain separate copies of skill content. GitHub Copilot marketplace
metadata is available at `.github/plugin/marketplace.json`; the same catalog is
also available at `.claude-plugin/marketplace.json` for Claude and Copilot's
fallback lookup. The legacy root `marketplace.json` is kept for existing
installers. Codex marketplace metadata is available at
`.agents/plugins/marketplace.json` and points to the package under `plugins/`.

## References

- [Agent Skills specification](https://agentskills.io/specification)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema)
- [OpenAI plugin skills](https://developers.openai.com/plugins/build/skills)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- [Vercel skills CLI](https://github.com/vercel-labs/skills)
- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)

## Contributing

Internal contributors: PS, CS, and platform engineers. Open a PR with new skills or improvements.

Skills should encode patterns you've seen work (or fail) across multiple customer engagements — not one-off configurations. If you've built the same kind of app three times, there's a skill in there.

## License

MIT
