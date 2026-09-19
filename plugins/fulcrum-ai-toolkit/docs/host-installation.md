# Host Installation

Install the complete skill collection. Sibling links are dependencies, not
instructions for a loader to fetch missing skills. Keep all skill
directories and their supporting files together, and retain the package
`LICENSE`. Do not flatten the directories or upload only one `SKILL.md`.

The package directory is the portable Agent Plugins bundle. Its core is
`plugin.json`, `mcp.json`, and `skills/`. Claude's native command adapter and
skill discovery tree live at the repository root, and Gemini's native manifest
lives under `adapters/gemini/`; both are outside the portable package. Strict
portable consumers should load the core files and omit native host adapters.

These are alpha installation targets. Host versions, administrator policy,
skill discovery, and support for token-authenticated remote MCP vary.
Installing skills does not connect a Fulcrum tenant.

## Claude Code, Codex, And Copilot CLI

Use the marketplace commands in the repository README. For Codex the install
command is `codex plugin add fulcrum-ai-toolkit@fulcrum-ai-toolkit`.

When a private repository includes this toolkit as a git submodule and registers
the submodule directory directly as a Claude plugin, use the submodule root.
Its `.claude-plugin/plugin.json` registers the root-level Claude-native manual
command adapter at `commands/fulcrum-solution-document.md`. Claude auto-discovers
the validator-checked copies of the distributable package's shared skills from
the repository-root `skills/` directory; that directory intentionally excludes
`fulcrum-solution-document`. Do not register the nested
portable package directly as a Claude plugin: its fixed `skills/` directory
must remain complete for Agent Plugins consumers, so it cannot enforce
Claude's manual-only invocation policy. The Claude marketplace selects the
repository root; the other marketplaces continue to select the nested
portable package.

## Cursor

Use Cursor's plugin installation UI or repository import with
`plugins/fulcrum-ai-toolkit/` as the plugin package. Cursor reads the
portable root `plugin.json` and discovers the shared `skills/` directory;
portable clients should ignore the native wrapper files.
If the available UI cannot select a nested package, use the complete
skills-loader installation from the repository README instead.

## Gemini CLI

Clone the repository, assemble the native bundle, then install it:

```bash
node scripts/build-gemini-extension.mjs
gemini extensions install ./plugins/fulcrum-ai-toolkit-gemini
```

The build copies the Gemini-native `gemini-extension.json`, the package license,
and the full canonical `skills/` collection into an ignored generated directory.
Do not substitute the portable package, repository-root URL, or a GitHub `tree/`
URL: the Gemini extension installer requires the generated native bundle.

## Hermes

Clone the repository and set Hermes's `skills.external_dirs` configuration to
the absolute path of `plugins/fulcrum-ai-toolkit/skills/` in that clone.
This uses the documented external-skill-directory mechanism and retains all
sibling resources. Keep the clone available while Hermes uses it.

Hermes also documents an Agent Plugins v1 compatibility adapter for a
package-root `plugin.json` and `skills/` tree. This package has that layout,
but this repository is a marketplace with a nested package. The toolkit does
not provide a native Python plugin or a `.hermes-plugin/plugin.yaml` adapter,
and does not claim that installing the repository root selects its nested
package. The external-directory path is the documented setup for this bundle.

## Claude Desktop Surfaces

Claude Code in the desktop app uses Claude Code's plugin workflow.

Regular Claude chat and Cowork use account-enabled skills. Copying files into
a local repository is not an account-level skill installation. This toolkit
does not yet ship a Desktop upload artifact that preserves the bundle's
cross-skill dependencies. Use a supported whole-bundle host rather than
uploading individual skills and assuming their siblings remain available.

## Microsoft 365 Copilot

Microsoft 365 Copilot requires uploading a ZIP with `SKILL.md` at the archive
root. Build the staged bundle from the repository root:

```bash
node scripts/build-m365-bundle.mjs
```

Upload `fulcrum-ai-toolkit-m365.zip`. Do not upload a ZIP whose first path
component is `fulcrum-ai-toolkit/`, `plugins/`, or the repository name; that
would place `SKILL.md` below the archive root and produce
“Bundle is missing a root-level SKILL.md”.
The staging build preserves skill references and converts `.ejs`, `.css`,
`.sql`, `.js`, and `LICENSE` into Markdown files that satisfy the current M365 custom
skills file-type support matrix.
CI publishes the same artifact as `fulcrum-ai-toolkit-m365` on push/PR runs and
attaches it to versioned releases.

## Connect Separately

Use the [regional App MCP setup guide](../skills/fulcrum-app-builder/resources/mcp-setup.md).
A host must support remote HTTP MCP with a configured Bearer header to use
the current service. An OAuth-only connector UI is not compatible with its
current authentication. Guidance and manual handoffs remain available.

## References

- [Claude Code plugin installation](https://code.claude.com/docs/en/discover-plugins)
- [Codex plugin commands](https://developers.openai.com/codex/cli/reference#codex-plugin)
- [Copilot plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
- [Cursor plugins](https://cursor.com/docs/plugins)
- [Gemini extension reference](https://geminicli.com/docs/extensions/reference/)
- [Hermes external skill directories](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills#external-skill-directories)
- [Hermes Agent Plugins support](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins#portable-agent-plugins-v1-packages)
- [Claude account skill packaging](https://claude.com/docs/skills/how-to#packaging-your-skill)
- [Vercel skills loader](https://github.com/vercel-labs/skills)
