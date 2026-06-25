# Fulcrum AI Toolkit

AI skills for building apps, data events, reports, and workflows on the [Fulcrum](https://www.fulcrumapp.com) platform.

## Install

```bash
claude plugin install fulcrum-ai-toolkit
```

Or add individual skills manually:

```bash
npx skills@latest add fulcrum-builders/fulcrum-ai-toolkit
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

## Contributing

Internal contributors: PS, CS, and platform engineers. Open a PR with new skills or improvements.

## License

MIT
