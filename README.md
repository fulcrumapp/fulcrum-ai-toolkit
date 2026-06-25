# Fulcrum AI Toolkit

AI skills for building apps, data events, reports, and workflows on the [Fulcrum](https://www.fulcrumapp.com) platform.

Modeled after the [Shopify AI Toolkit](https://github.com/Shopify/Shopify-AI-Toolkit) — skills are markdown files with structured metadata that AI agents consume automatically during app building.

## Install

```bash
claude plugin install fulcrum-ai-toolkit
```

Or add individual skills manually:

```bash
npx skills@latest add fulcrumapp/fulcrum-ai-toolkit
```

## Skills

| Skill | Description | Type |
|-------|-------------|------|
| `fulcrum-app-design` | App structure, field types, linked apps vs single app, repeatables | Model-invoked |
| `fulcrum-app-goal` | Ensure every app has a clear goal and defined deliverable | Model-invoked |
| `fulcrum-safety` | Flag missing safety steps in field workflows | Model-invoked |
| `fulcrum-data-events` | Data event patterns, anti-patterns, and platform constraints | Model-invoked |
| `fulcrum-workflow-decomposition` | Break monolithic apps into composable, maintainable pieces | Model-invoked |
| `fulcrum-discovery` | Process discovery before building — interview the customer | User-invoked |

## Usage

Skills are **model-invoked** by default: the agent fires them automatically when building Fulcrum apps. The agent will:

- Check that every app has a clear goal before building (`fulcrum-app-goal`)
- Select appropriate field types and app structure (`fulcrum-app-design`)
- Flag missing safety steps in field workflows (`fulcrum-safety`)
- Apply data event best practices and avoid anti-patterns (`fulcrum-data-events`)
- Recommend decomposition when apps grow too complex (`fulcrum-workflow-decomposition`)

The `fulcrum-discovery` skill is **user-invoked** — run it manually when starting a new project to interview the customer before building.

## Where this comes from

These skills aren't theoretical — they're distilled from real production work across CS, PS, and platform engineering.

### Sources

- **Jared Carey's App Build Methodology** — PS methodology doc covering the full build lifecycle: Discovery, Design, Build, Test/Deploy. Informed the skill chain from discovery interview through workflow decomposition. Real-world patterns from MasTec (350-field monolith), Entergy, National Grid, and commercial accounts.

- **Kyle Pennell's fulcrum-tools-share** — 113 curated production examples from Solutions Engineering. Data event patterns, cascading choices, geofencing, role-based permissions, status state machines, and the PDF-to-Form-Report pipeline. The anti-patterns and platform constraints in `fulcrum-data-events` come directly from these production scripts.

- **MasTec deep dive** — A 350-field telecom construction app that tried to capture an entire lifecycle in one form. Five different roles, 60+ data event edge cases, three restructuring attempts. The decomposition example in `fulcrum-workflow-decomposition` is based on this real case. Key lesson: "You will not put them in the same box" — template maturity models fail when customers need different workflows.

- **Permission loophole findings** — Jared Carey identified three permission bypass patterns in production data events: client-side export bypass, bulk update bypass, and visibility rules vs data events conflicts. These are documented as anti-patterns in `fulcrum-data-events`.

- **Digital Transformation Best Practices** — Six practices extracted from PS engagement patterns: process discovery before building, output-first design, decompose by role, iterate don't perfect, change management, governance. These shaped `fulcrum-discovery` and `fulcrum-app-goal`.

### Skill format

Skills follow the [SKILL.md format](https://github.com/Shopify/Shopify-AI-Toolkit): YAML frontmatter (name, description, invocation type) + markdown body. Design principles from [Matt Pocock's skills repo](https://github.com/mattpocock/skills): leading words, completion criteria, progressive disclosure, no-ops pruned.

### Platform support

Plugin configs are included for multiple AI platforms:

| Platform | Config |
|----------|--------|
| Claude Code | `.claude-plugin/plugin.json` |
| Cursor | `.cursor-plugin/plugin.json` |
| Codex | `.codex-plugin/plugin.json` |
| Hermes | `.hermes-plugin/` |
| Gemini | `gemini-extension.json` |
| MCP | `.mcp.json` |

## Contributing

Internal contributors: PS, CS, and platform engineers. Open a PR with new skills or improvements.

Skills should encode patterns you've seen work (or fail) across multiple customer engagements — not one-off configurations. If you've built the same kind of app three times, there's a skill in there.

## License

MIT
