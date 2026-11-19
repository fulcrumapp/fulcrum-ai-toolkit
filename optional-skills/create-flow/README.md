# create-flow

> **This is experimental, do not use unless you are completely sure what you doing**

Version **3.0.0**. A standalone assistant skill for authoring Fulcrum FLOWs and
data events. No package installation, API token, or extra skill is required
to read it. Live discovery and execution require separately authorized tools
and a compatible Fulcrum runtime.

## Use or share

This optional skill is separate from the toolkit's default plugin and Microsoft
365 bundle. Install it only by choosing it explicitly; installing the toolkit
does not install or enable it. Share the entire `create-flow/` folder rather
than flattening it.

On clients supporting project Agent Skills, copy `create-flow/` into
`.github/skills/` in the intended repository. Other clients may use a different
skills directory or an import action: follow that client's instructions.
For manual use, ask the assistant to read `SKILL.md` and the referenced files.
Do not rename `SKILL.md` or flatten the folder.

Start with: "Use create-flow to help me design a workflow for my app."
Then provide the intended behavior and target build. The skill is explicitly
invoked; verify that your host supports disabling implicit invocation before
installing it, or use it manually without installing. Never paste credentials.

## Contents and limits

The package contains instructions, two focused references, and a read-only FLOW
example. It contains no tenant-specific
identifiers, discovery credential helper, MCP configuration, runtime patch,
device script, canvas extension, or historical session backup. Compose live
scripts with existing handlers and review them before approval; the example
is not an automatic deployment.

This skill uses this package, not application source inspection, as the runtime
reference for FLOW authoring. Maintainers may inspect source separately when
explicitly authorized to update the skill. Unknown or changed contracts require
updated guidance or independent verification, not guesswork.

Android source evidence is pinned in the runtime reference. It is not a claim
that every released or installed build supports those tools. Generated
workflows still need their own parser, permissions, and device checks.
