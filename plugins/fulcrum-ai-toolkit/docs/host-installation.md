# Host Installation

Install the complete skill collection. Sibling links are dependencies, not
instructions for a loader to fetch missing skills. Keep all skill
directories and their supporting files together, and retain the package
`LICENSE`. Do not flatten the directories or upload only one `SKILL.md`.

The package directory is a multi-format bundle. Its portable Agent Plugins
core is `plugin.json`, `mcp.json`, and `skills/`; the Claude and Gemini wrapper
files are native adapters and are not part of the portable core. Strict
portable consumers should load the core files and omit the native wrappers.

These are alpha installation targets. Host versions, administrator policy,
skill discovery, and support for token-authenticated remote MCP vary.
Installing skills does not connect a Fulcrum tenant.

## Claude Code, Codex, And Copilot CLI

Use the marketplace commands in the repository README. For Codex the install
command is `codex plugin add fulcrum-ai-toolkit@fulcrum-ai-toolkit`.

When a private repository includes this toolkit as a git submodule and registers
the submodule directory directly as a Claude plugin, use the submodule root.
Its `.claude-plugin/plugin.json` points to the distributable package's shared
`skills/` directory. Do not register the parent private repository as the plugin
root unless its own marketplace entry selects the toolkit submodule path.
For ordinary marketplace installation, the marketplace continues to select the
nested package directly.

## Cursor

Use Cursor's plugin installation UI or repository import with
`plugins/fulcrum-ai-toolkit/` as the plugin package. Cursor reads the
portable root `plugin.json` and discovers the shared `skills/` directory;
portable clients should ignore the native wrapper files.
If the available UI cannot select a nested package, use the complete
skills-loader installation from the repository README instead.

## Gemini CLI

Clone the repository, then run from its root:

```bash
gemini extensions install ./plugins/fulcrum-ai-toolkit
```

The local directory contains the Gemini-native `gemini-extension.json` and the
full `skills/` collection. Do not substitute the repository-root URL or a GitHub `tree/` URL:
the extension installer is not the skills installer's subdirectory interface.

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
