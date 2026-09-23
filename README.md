# Fulcrum AI Toolkit

Portable AI skills for building apps, data events, reports, integrations,
mapping, queries, access models, and migrations on the
[Fulcrum](https://www.fulcrumapp.com) platform.

Built around the open [Agent Skills standard](https://agentskills.io/specification) — skills are portable Markdown workflows with structured metadata that compatible AI agents load on demand.

Use the toolkit for guidance and implementation handoffs without a connector,
or connect Fulcrum App MCP for approved live app-configuration work.

## Install

This repository is a marketplace containing the distributable
`plugins/fulcrum-ai-toolkit/` package.

In Claude Code, add the marketplace and install the plugin:

```bash
/plugin marketplace add https://github.com/fulcrumapp/fulcrum-ai-toolkit.git
/plugin install fulcrum-ai-toolkit@fulcrum-ai-toolkit
```

Private repositories may also include this repository as a git submodule and
use the submodule root as a Claude plugin. The root
`.claude-plugin/plugin.json` points Claude to the nested package's shared skills.

In Codex, add the repository marketplace, then install
`fulcrum-ai-toolkit` from the Plugins directory:

```bash
codex plugin marketplace add fulcrumapp/fulcrum-ai-toolkit
codex plugin add fulcrum-ai-toolkit@fulcrum-ai-toolkit
```

In GitHub Copilot CLI, add the marketplace and install the plugin:

```bash
copilot plugin marketplace add fulcrumapp/fulcrum-ai-toolkit
copilot plugin install fulcrum-ai-toolkit@fulcrum-ai-toolkit
```

For a standalone skills loader, install the complete collection:

```bash
npx skills@latest add https://github.com/fulcrumapp/fulcrum-ai-toolkit/tree/main/plugins/fulcrum-ai-toolkit/skills --skill '*'
```

For Microsoft 365 Copilot's skill upload, build the staged bundle that keeps
`SKILL.md` at the ZIP root and converts unsupported bundle resources:

```bash
node scripts/build-m365-bundle.mjs
```

Upload `fulcrum-ai-toolkit-m365.zip`, not a ZIP of the repository or its
parent directory. The staged bundle includes a bundle-level `SKILL.md` with
the required YAML `name` and `description` fields, preserves sibling skill
references, and converts `.ejs`, `.css`, `.sql`, and `LICENSE` into Markdown
files accepted by the current Microsoft 365 skill-upload contract.

The supported distribution unit is the **complete skill bundle**. Skills link
to sibling skills and their resources; an individual directory is not a
self-contained package, and loaders do not automatically install dependencies.
For manual installation, copy all directories under
`plugins/fulcrum-ai-toolkit/skills/` into one host-supported skill directory,
preserving their names, supporting files, and sibling layout. Retain the
[package license](plugins/fulcrum-ai-toolkit/LICENSE) with the copied collection.
In this repository, `.agents/` holds repository-scoped agent assets and
marketplace metadata, not the distributable skills.

See [host installation details](plugins/fulcrum-ai-toolkit/docs/host-installation.md)
for Cursor, Gemini, Hermes, and the different Claude Desktop surfaces.

## Connect Fulcrum MCP

The hosted Fulcrum MCP service is a federated gateway for App MCP and Query MCP.
It is available at `https://mcp.fulcrumapp.com`, with
different hosts for Australian, European, and Canadian tenants. Select the
endpoint from the **tenant's Fulcrum instance**, not your physical location.
There is no automatic region fallback.

Follow the [regional MCP setup guide](plugins/fulcrum-ai-toolkit/skills/fulcrum-app-builder/resources/mcp-setup.md)
to choose the endpoint and configure your agent. Authentication uses your
existing Fulcrum organization API token in an `Authorization: Bearer` header;
OAuth login is not supported. Keep the opaque token in the host's secret store
or an environment variable, never in this repository or a chat message.

The toolkit installs guidance skills only. It does not register a server or
bundle credentials; its MCP manifests intentionally contain no servers.
When separately registered for the confirmed tenant, the gateway provides App
MCP as the default control plane for supported app configuration and knowledge
operations, plus Query MCP for read-only Query API discovery and execution.
Without it, `fulcrum-app-builder` stops at an approved implementation handoff
and Query MCP execution is unavailable. App MCP covers forms, schema builders
and validation, choices, classifications, projects, layer metadata, webhooks,
Reference Files, memberships and roles, Report Templates, and report
generation. Query MCP exposes read-only queries; record CRUD, media CRUD, and
query mutations still require other supported interfaces.

Existing endpoint URLs, authentication, the `fulcrum-app` client alias, and the
`FULCRUM_APP_MCP_URL` convention remain valid. They are client-side
configuration labels for the same endpoint; federation happens server-side.
Live installed gateway schemas define connector tool arguments and result
shapes and take precedence over toolkit prose.

## Start here

1. Let `fulcrum-discovery` clarify a new workflow. It will offer a quick
   check-in or full interview and honor the user's choice.
2. Define the goal and deliverable with `fulcrum-app-goal`.
3. Use `fulcrum-app-builder` and `fulcrum-app-design` to propose and approve a schema.
4. Route integration, mapping, Query API, access, and migration decisions to
   their focused skills.
5. Build through Fulcrum App MCP when available, or use the approved handoff.
6. Test the workflow and document the result with `fulcrum-solution-document`.

To assess an existing or proposed app instead of building one, use
`fulcrum-app-scorecard`: an evidence-based **1 (poor) to 10 (excellent)** design
score, findings tied to existing skills, and prioritized improvements.
Any app containing a repeatable is **capped at 6/10**, not automatically
awarded six points. Missing evidence produces explicit unknowns and a
provisional range rather than an inflated grade. The
[versioned rubric](plugins/fulcrum-ai-toolkit/skills/fulcrum-app-scorecard/resources/rubric.md)
can be supplemented with additional checks and caps later.

Creation and edit confirmations also include the proposed app score, strengths,
and constructive improvement advice. Users may approve the design without
adopting advisory recommendations; the score stays honest and required safety
and authorization boundaries still apply.

Whenever code is authored, modified, or reviewed, `fulcrum-performance-review`
evaluates workload growth, repeated I/O, rendering, and memory before delivery.
It covers Data Events, calculations, reports/SQL, extensions, and other
toolkit code paths, and distinguishes static risks from measured results.
The review includes code in attachments, Reference Files, embedded templates,
bundles, and indirectly loaded dependencies. Anything that cannot be inspected
remains explicitly unreviewed; reviewing a launcher alone is not a complete
app or extension assessment.

## Alpha install matrix

The distributable package uses the portable
`plugins/fulcrum-ai-toolkit/skills/*/SKILL.md` layout. Host-specific manifests
are adapters inside that package and either discover the standard `skills/`
directory or explicitly point to it when the host contract supports that field.

| Host | Install path | Skills | Live Fulcrum actions | Alpha status |
| --- | --- | --- | --- | --- |
| Generic skills loader | Add all skills, preserving sibling layout | Yes | No, connector required | Target |
| Claude Code | Add the Claude marketplace, or use the repository/submodule root as a plugin | Yes | Connector-dependent | Target |
| Cursor | Install `plugins/fulcrum-ai-toolkit/` as a plugin | Yes | Connector-dependent | Target |
| Codex | Add the repository marketplace, then install the plugin | Yes | Connector-dependent | Target |
| GitHub Copilot | Add this marketplace, then install the plugin | Yes | Connector-dependent | Target |
| Gemini CLI | Clone, then install the local package directory as an extension | Yes | Connector-dependent | Verify |
| Hermes | Configure the full local `skills/` directory via `skills.external_dirs` | Yes | Connector-dependent | Verify |
| Claude Code in Desktop | Use Claude Code's marketplace/plugin installation | Yes | Connector-dependent | Target |
| Claude Desktop chat / Cowork | Requires account-level skill packaging that preserves dependencies; repo copying is insufficient | Not packaged | Host authentication support required | Later |

The `Target` and `Verify` labels describe the toolkit's intended alpha support,
not a claim that every host has been tested in this repository yet.

## Local validation

Validation runs entirely on Node.js. Install dependencies for the format validator and run the checks from the repository root:

```bash
npm ci --prefix tools/format-validator
npm run --prefix tools/format-validator validate
node scripts/validate.mjs
node --test test/app-scorecard.test.mjs test/app-approval.test.mjs test/build-m365-bundle.test.mjs test/validate-entrypoint-frontmatter.test.mjs
```

The repository validator checks the expected skill inventory, skill frontmatter,
directory/name consistency, corporate absolute paths, privacy and provenance contracts,
portable and client JSON manifests, and README inventory. The portable
`plugin.json` intentionally omits `$schema` because Claude's SDK warns on
unknown top-level fields when it encounters that manifest.
It also keeps release versions aligned, requires the packaged license and
Codex manual-invocation policies, and guards the regional MCP endpoint map
and empty default server configuration.
Guidance contract tests check the rubric inventory, sibling links, worked
scoring arithmetic, and required approval/performance instructions; they do
not prove an agent's live app assessment or runtime performance.
Structural and schema validation for externalized examples and assets runs via
`tools/format-validator` using Ajv and pinned parsers.
In CI, GitHub Actions also validates the Claude plugin marketplace using Anthropic's official
`validate-plugins` composite action.

## Releases

The toolkit version is defined in
[`plugins/fulcrum-ai-toolkit/plugin.json`](plugins/fulcrum-ai-toolkit/plugin.json).
The repository validator requires every host manifest and marketplace entry to
match it. After a version bump is merged to `main`, the release workflow creates
the corresponding `v<version>` tag and GitHub Release. Re-running the workflow
is safe when that release already exists.

Validation never runs anything this repository authors. HTML is parsed, its
inline scripts and styles are parsed, a report template is compiled to source by
the pinned official EJS parser and then parsed, and CSS, PostgreSQL, JSON, and
JavaScript are parsed. No template is rendered, no example script is executed,
and no query is issued, so validation needs no sandbox and claims none. Files
that are not whole documents are labeled `Fragment:` and validated as such.
Beyond well-formedness the validator decides two contracts: read-only SQL, and
what a `QUERY()` call and its interpolation may be.

Nothing here proves that arbitrary EJS escapes safely or that a template renders
to valid HTML. No branch analysis is performed and none is claimed. What the
report templates must contain is stated instead as repository example checks
over this repository's own fixed set of twelve templates.

Every SQL statement — in a `.sql` asset or in a report template's `QUERY()`
call — is held to allowlists applied to the parsed PostgreSQL tree: SELECT only,
one statement per `QUERY()` call, and an exact set of node forms, operators, cast
targets, and functions taken from what the examples actually use. So a write
hidden after a semicolon, inside a CTE, behind a comment, or in a quoted function
name is rejected, and `::application_side_effect_type`, `@@`, `SELECT ... INTO`,
an unrecognized function, and a second statement riding along in one call all
fail closed.

Every report template is turned into JavaScript, parsed, and walked to find its
`QUERY()` calls, so a call written with a double-quoted string, an interposed
comment, or a newline cannot escape the check. The helper is also reachable
through the locals bag `ejs` opens with `with`, so `locals.QUERY(...)` and
`locals['QUERY'](...)` are read the same way, and everything that could hide a
call — a name referenced without being called, a computed property that is not a
literal, the locals bag used as a value, `eval`, `Function`, `arguments`,
`constructor`, `prototype`, `globalThis`, `Reflect` — is refused rather than
guessed at.

Reading a statement means replacing each `${...}` with a placeholder, and a
placeholder is only earned. A gap is accepted only when it is one of two
recognized encoders written in the gap itself and inside quotes —
`('' + value).replace(/[^0-9-]/g, '')` for a date literal and
`('' + value).replace(/[^A-Za-z0-9_-]/g, '')` for an identifier literal — and
everything else is refused, including a value sanitized further up and a class
this list does not name. The examples convert with `('' + value)` rather than
`String(value)` because `String` is an ordinary binding inside a template;
rebinding or overwriting `String` or `RegExp` — through `const`, a parameter, a
`catch` clause, an assignment, or a prototype — is refused in any case. Each
recognized class is measured on every run against the characters it actually
keeps, so it cannot be widened without the check that depends on it failing.

The report templates are a fixed, checked-in set. `test/data/example-block-inventory.json`
lists each one by path, pins it by SHA-256, and declares whether it is a whole
document or a fragment, so adding, renaming, or editing a template requires a
visible inventory update in the same change. Each template must also compile and
parse, and must use neither a raw output tag nor an EJS output internal, both
checked as the literal text they are. The date-range example carries per-file
assertions for the table wrapper that was reviewed by hand: its `<table>`,
`<thead>`, and `<tbody>` open before its row branches and close after them, and
each branch writes a complete row. These are checks on this repository's
examples; they generalize to nothing else. Bypass probes for the SQL and
`QUERY()` contracts run on every invocation, on the same code paths the
repository's own files take. These static checks do not establish host skill
activation, an authenticated MCP connection, or successful live app creation.

## Skills

| Skill | Description | Type |
| ------- | ------------- | ------ |
| `fulcrum-product-knowledge` | Fulcrum platform capability router, constraints, plans, boundaries, and App MCP build reference | Model-invoked |
| `fulcrum-integration-patterns` | Workflow and integration selection, webhooks, URL Actions, REST, middleware, and delivery safety | Model-invoked |
| `fulcrum-gis-mapping` | GIS/layer selection, online/offline mapping, geometry, and import/export boundaries | Model-invoked |
| `fulcrum-query-api` | Query MCP read-only discovery, SQL modeling, execution, and validation | Model-invoked |
| `fulcrum-access-management` | Roles, resource access, memberships, SSO/SCIM, and least-privilege reasoning | Model-invoked |
| `fulcrum-data-migration` | Supported migration assessment, mapping, dry runs, reconciliation, cutover, and rollback design | Model-invoked |
| `fulcrum-app-builder` | Novice-friendly app discovery, schema approval, App MCP orchestration, and connector-independent handoff | Model-invoked |
| `fulcrum-app-design` | App structure, field types, linked apps vs single app, repeatables | Model-invoked |
| `fulcrum-app-scorecard` | Evidence-based 1-10 app design scoring, repeatable ceiling, and extensible rubric | Model-invoked |
| `fulcrum-performance-review` | Workload-based performance evaluation for every code artifact, with constructive advice and explicit measurement limits | Model-invoked |
| `fulcrum-app-goal` | Ensure every app has a clear goal and defined deliverable | Model-invoked |
| `fulcrum-safety` | Flag missing safety steps in field workflows | Model-invoked |
| `fulcrum-data-events` | Data event patterns, anti-patterns, and platform constraints | Model-invoked |
| `fulcrum-workflow-decomposition` | Break monolithic apps into composable, maintainable pieces | Model-invoked |
| `fulcrum-app-extensions` | App extension anatomy, FS bridge API, offline support, picker anti-pattern | Model-invoked |
| `fulcrum-report-building` | Report template authoring — EJS tags, repeatables, parameters, debugging | Model-invoked |
| `fulcrum-discovery` | Process discovery before building — interview the customer | Model-invoked |
| `fulcrum-solution-document` | Post-build documentation, privacy review, and destination-neutral sharing formats | User-invoked |

## Usage

Skills are intended to be **model-invoked** by default on hosts that support
automatic selection. Matching and invocation syntax vary by host. The agent
uses the focused skill to:

- Use the platform router for capability, plan, public AI, offline, and App MCP
  boundary decisions (`fulcrum-product-knowledge`)
- Select Workflows, webhooks, URL Actions, REST, and middleware safely
  (`fulcrum-integration-patterns`)
- Verify current GIS, layer, geometry, and online/offline mapping support
  (`fulcrum-gis-mapping`)
- Discover, execute, and validate bounded read-only SQL through Query MCP
  (`fulcrum-query-api`)
- Design role plus resource access and SSO/SCIM lifecycle controls
  (`fulcrum-access-management`)
- Plan supported migrations with dry-run, reconciliation, and rollback evidence
  (`fulcrum-data-migration`)
- Clarify new app and workflow requirements with a quick check-in or an optional
  full interview (`fulcrum-discovery`)
- Guide app discovery, schema approval, and App MCP-dependent execution (`fulcrum-app-builder`)
- Check that every app has a clear goal before building (`fulcrum-app-goal`)
- Select appropriate field types and app structure (`fulcrum-app-design`)
- Score existing or proposed apps and prioritize design improvements (`fulcrum-app-scorecard`)
- Evaluate every authored, modified, or reviewed code artifact for performance (`fulcrum-performance-review`)
- Flag missing safety steps in field workflows (`fulcrum-safety`)
- Apply data event best practices and avoid anti-patterns (`fulcrum-data-events`)
- Recommend decomposition when apps grow too complex (`fulcrum-workflow-decomposition`)
- Apply extension best practices and avoid the picker anti-pattern (`fulcrum-app-extensions`)
- Guide report template authoring with correct EJS patterns and parameter handling (`fulcrum-report-building`)

One skill is intended to be **user-invoked** — request it explicitly:

- `fulcrum-solution-document` — after building, document what was built, review it for privacy, and prepare it for a destination chosen by the user

For `fulcrum-solution-document`, Claude Code and Cursor use
`disable-model-invocation: true`, while Codex uses the skill's
`agents/openai.yaml` policy. These are host adapters, not guarantees provided by
the Agent Skills standard. On other hosts, invocation behavior may differ.
Contextual discovery still asks the user to choose a quick check-in or full
interview, and explicit approval remains required before an external send.

## Where this comes from

The toolkit combines public Fulcrum documentation with portable workflow
guidance. Live Fulcrum MCP gateway schemas own connector names, arguments, and
result shapes; public Fulcrum documentation owns product and runtime behavior.

Distributable provenance uses `> Source:` notes with a public URL. The legacy
coverage manifest may instead use its neutral `Inventory fingerprint:` label.
Named people, customers, and non-public research attribution are not valid
public provenance. Validation enforces these structural cues across packaged
text, including dotfiles; it is not a general-purpose personal-data detector.

The five layer-3 product skills prohibit any triple-backtick or triple-tilde
token anywhere in a packaged regular file. This intentionally simple rule is
stricter than Markdown fence parsing; later layers own executable examples and
their durable externalization policy.

### Sources

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/) for public
  platform behavior and runtime functions.
- [Fulcrum public OpenAPI document](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
  for REST resource shapes.
- Live installed Fulcrum MCP gateway schemas for the App MCP control-plane and
  Query MCP read-only execution contracts used by the current workflow guidance.

The [legacy product-knowledge migration coverage map](plugins/fulcrum-ai-toolkit/docs/legacy-product-knowledge-coverage.md)
tracks every legacy domain, its canonical target, public sources, and material
that must remain private or be dropped.

### Skill format

Skills follow the [Agent Skills specification](https://agentskills.io/specification):
each distributable skill under `plugins/fulcrum-ai-toolkit/skills/` is a
directory containing a `SKILL.md` with YAML frontmatter (`name` and
`description`) plus a Markdown body. Host-specific invocation fields and
sidecars supplement the portable content; unsupported hosts may ignore them.

### Platform support

Plugin configs are included for multiple AI platforms:

| Platform | Config |
| ---------- | -------- |
| GitHub Copilot CLI | `.github/plugin/marketplace.json` and `plugins/fulcrum-ai-toolkit/plugin.json` |
| Claude Code | `.claude-plugin/plugin.json` at the repository root, or the nested package manifest at `plugins/fulcrum-ai-toolkit/.claude-plugin/plugin.json` |
| Cursor | `plugins/fulcrum-ai-toolkit/.cursor-plugin/plugin.json` |
| Codex | `plugins/fulcrum-ai-toolkit/.codex-plugin/plugin.json` |
| Hermes | Shared `skills/` directory; root `plugin.json` for hosts supporting Agent Plugins v1 |
| Gemini | `plugins/fulcrum-ai-toolkit/gemini-extension.json` |
| MCP | Empty `.mcp.json` and `mcp.json`; configure a tenant-specific server separately |

All hosts discover or reference the package's shared `skills/` directory; they
do not maintain separate copies of skill content. GitHub Copilot marketplace
metadata is available at `.github/plugin/marketplace.json`; the same catalog is
also available at `.claude-plugin/marketplace.json` for Claude and Copilot's
fallback lookup. A root `.claude-plugin/plugin.json` supports repositories that
consume this repository as a plugin submodule. The legacy root
`marketplace.json` is kept for existing installers. Codex marketplace metadata is available at
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

Contributions from Fulcrum customers, partners, independent builders, and
Fulcrum teams are welcome. Open a PR with new skills or improvements.

Skills should encode reusable patterns, not tenant-specific configurations.
Use public sources, distinguish workflow recommendations from product
constraints, and omit customer data, credentials, and private attribution.

## License

[MIT](LICENSE). The distributable plugin includes the same [license
text](plugins/fulcrum-ai-toolkit/LICENSE).
