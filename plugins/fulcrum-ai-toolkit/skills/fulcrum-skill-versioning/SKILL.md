---
name: fulcrum-skill-versioning
description: Use before every change to a Fulcrum AI Toolkit skill or its supporting resources, examples, or assets—not just during release work. Identify each affected skill and increment its SemVer version in the same change.
metadata:
  version: "1.0.0"
---

# Fulcrum Skill Versioning

Every distributable skill is independently versioned in
`metadata.version` in its `SKILL.md` frontmatter. A change anywhere inside a
skill directory is a change to that skill, including resources, examples,
assets, and agent-specific sidecars. Apply this rule whenever a skill changes
for any reason—feature work, maintenance, bug fixes, or documentation edits.
Do not defer a version increment until release preparation or publishing; make
it in the same change as the skill edit.

## Version Policy

Use stable numeric SemVer in the quoted form `MAJOR.MINOR.PATCH`:

- **PATCH** for corrections and clarifications that do not change the skill's
  intended behavior.
- **MINOR** for additive guidance, workflows, capabilities, or supported cases.
- **MAJOR** for incompatible changes to invocation, required workflow, or
  output contracts.

Start a newly created skill at `1.0.0`. Never reset an existing skill's version
when reorganizing files or moving it between hosts. The bundle's plugin version
is separate; changing a plugin manifest does not replace the per-skill bump.

## Change Workflow

1. Before editing, read the current `metadata.version` for each skill you expect
   to change and choose the appropriate SemVer increment. Use the pull
   request's base ref or the base revision supplied by the task. List all
   changed files under the toolkit's distributable skill directory:

   ```bash
   git diff --name-only BASE...HEAD -- plugins/fulcrum-ai-toolkit/skills/
   ```

2. Group the changed paths by their immediate skill directory. Inspect every
   change, including supporting files, and choose the smallest SemVer increment
   that accurately describes its impact.
3. Increment `metadata.version` in each changed skill's `SKILL.md` in the same
   patch as its content or supporting-file edits. Do not postpone this until a
   later commit or release, bump unrelated skills, or treat a plugin-level
   version change as a substitute.
4. Validate version metadata and changed-skill bumps:

   ```bash
   node scripts/validate.mjs
   FULCRUM_SKILL_VERSION_BASE="<base-ref>" node scripts/validate-skill-version-bumps.mjs
   ```

   The version validator checks all files in each changed skill directory
   against the selected base. Existing skills without a prior version are
   accepted as a one-time migration baseline; once a base version exists, every
   change must increase it.

5. Confirm the diff includes a version increment for every changed skill and
   no unrelated version changes before delivery.

## References

- [Agent Skills specification](https://agentskills.io/specification)
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)
