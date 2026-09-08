# Host Installation

Install the complete skill collection. Sibling links are dependencies, not
instructions for a loader to fetch missing skills. Keep all 16 skill
directories and their supporting files together, and retain the package
`LICENSE`. Do not flatten the directories or upload only one `SKILL.md`.

These are alpha installation targets. Host versions, administrator policy,
skill discovery, and support for token-authenticated remote MCP vary.
Installing skills does not connect a Fulcrum tenant.

## Claude Code, Codex, And Copilot CLI

Use the marketplace commands in the repository README. For Codex the install
command is `codex plugin add fulcrum-ai-toolkit@fulcrum-ai-toolkit`.
The marketplace identifies the nested package; do not install the repository
root as though it were the plugin root.

## Cursor

Use Cursor's plugin installation UI or repository import with
`plugins/fulcrum-ai-toolkit/` as the plugin package. Its
`.cursor-plugin/plugin.json` points to `./skills/`.
If the available UI cannot select a nested package, use the complete
skills-loader installation from the repository README instead.

## Gemini CLI

Clone the repository, then run from its root:

```bash
gemini extensions install ./plugins/fulcrum-ai-toolkit
```

The local directory contains `gemini-extension.json` and the full `skills/`
collection. Do not substitute the repository-root URL or a GitHub `tree/` URL:
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
