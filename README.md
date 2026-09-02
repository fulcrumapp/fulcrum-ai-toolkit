# Fulcrum AI Toolkit

AI skills for building apps, data events, reports, and workflows on the [Fulcrum](https://www.fulcrumapp.com) platform.

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

The toolkit installs guidance skills only. It does not include the Fulcrum MCP
server or Fulcrum credentials. Live app creation and updates require a
separately configured Fulcrum MCP connector; without one, `fulcrum-app-builder`
stops at an approved implementation handoff.

## Start here

1. Run `fulcrum-discovery` for a new workflow.
2. Define the goal and deliverable with `fulcrum-app-goal`.
3. Use `fulcrum-app-builder` and `fulcrum-app-design` to propose and approve a schema.
4. Review safety, offline, integration, and plan constraints.
5. Build manually in Fulcrum or through an available Fulcrum MCP connector.
6. Test the workflow and document the result with `fulcrum-solution-document`.

## Alpha install matrix

The distributable package uses the portable
`plugins/fulcrum-ai-toolkit/skills/*/SKILL.md` layout. Host-specific manifests
are adapters inside that package and all point to its shared `skills/`
directory.

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

Run the dependency-free alpha checks from the repository root:

```bash
ruby scripts/validate.rb
ruby test/smoke_test.rb
```

The validator checks skill frontmatter, directory/name consistency, corporate
absolute paths, possible credentials, JSON manifests, and README inventory.
The smoke test exercises a small site-inspection workflow through discovery,
schema approval, offline review, and the no-MCP handoff path.

## Skills

| Skill | Description | Type |
| ------- | ------------- | ------ |
| `fulcrum-product-knowledge` | Canonical Fulcrum platform capabilities, constraints, plans, integrations, GIS, Query API, and MCP build reference | Model-invoked |
| `fulcrum-app-builder` | Novice-friendly app discovery, schema approval, MCP build orchestration, and connector-independent handoff | Model-invoked |
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

- Use the canonical platform reference for capability, plan, offline, and integration decisions (`fulcrum-product-knowledge`)
- Guide app discovery, schema approval, and connector-dependent execution (`fulcrum-app-builder`)
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

These skills aren't theoretical — they're distilled from real production work across CS, PS, and platform engineering.

### Sources

- **Jared Carey's App Build Methodology** — PS methodology doc covering the full build lifecycle: Discovery, Design, Build, Test/Deploy. Informed the skill chain from discovery interview through workflow decomposition. Real-world patterns from MasTec (350-field monolith), Entergy, National Grid, and commercial accounts.

- **Kyle Pennell's fulcrum-tools-share** — 113 curated production examples from Solutions Engineering. Data event patterns, cascading choices, geofencing, role-based permissions, status state machines, and the PDF-to-Form-Report pipeline. The anti-patterns and platform constraints in `fulcrum-data-events` come directly from these production scripts.

- **MasTec deep dive** — A 350-field telecom construction app that tried to capture an entire lifecycle in one form. Five different roles, 60+ data event edge cases, three restructuring attempts. The decomposition example in `fulcrum-workflow-decomposition` is based on this real case. Key lesson: "You will not put them in the same box" — template maturity models fail when customers need different workflows.

- **Permission loophole findings** — Jared Carey identified three permission bypass patterns in production data events: client-side export bypass, bulk update bypass, and visibility rules vs data events conflicts. These are documented as anti-patterns in `fulcrum-data-events`.

- **Digital Transformation Best Practices** — Six practices extracted from PS engagement patterns: process discovery before building, output-first design, decompose by role, iterate don't perfect, change management, governance. These shaped `fulcrum-discovery` and `fulcrum-app-goal`.

- **fulcrum-product-knowledge (SE/PS reference skill)** — A comprehensive platform knowledge base maintained for the Solutions Engineering and Professional Services teams. Covers plans and licensing gates, field type constraints, integration decision frameworks, reporting architecture, GIS limitations, and the full Query API reference. Gap analysis against this source drove the July 2026 updates to `fulcrum-data-events` (LOADFILE, STORAGE, CORS, plan gates), `fulcrum-app-design` (choice value/label distinction, Classification Set constraint, platform limits, predefined vs. ad hoc pattern), and `fulcrum-discovery` (platform boundaries and misconceptions as a pre-build check). Ongoing source for future skills: `fulcrum-report-building`, `fulcrum-app-extensions`, `fulcrum-query-api`, `fulcrum-integration-patterns`, `fulcrum-gis-mapping`.
- **Corporate Claude Desktop skill packages** — `fulcrum-product-knowledge.skill` and `fulcrum-app-builder.skill` are the source snapshots supplied for this import. Their content is maintained as repository-native copies in `plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/` and `plugins/fulcrum-ai-toolkit/skills/fulcrum-app-builder/`. The copies remove the corporate `/mnt/skills/organization` dependency, point to the repository-local reference skill, and preserve a connector-independent handoff when no Fulcrum MCP is configured. The repository does not provide a Fulcrum MCP server; live app mutations require a separately configured connector.

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

All host adapters point to the package's `skills/` directory; they do not
maintain separate copies of skill content. GitHub Copilot marketplace metadata
is available at `.github/plugin/marketplace.json`; the same catalog is also
available at `.claude-plugin/marketplace.json` for Claude and Copilot's
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
