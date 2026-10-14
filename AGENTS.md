# Agent Instructions

<!--
This is only a starting point for AGENTS.md.
Customize and add instructions and documentation that will provide context to the agent that is specific to this project.
-->

## Overview
<!-- Describe the what the project is and what its purpose is. -->

## Project Structure
<!-- Describe the structure of the project that is relevant for the agent to know. -->

## Code Style Guidelines
<!-- Describe any coding standards to follow. -->

## Test Guidelines

For toolkit contributions, including skill-authoring changes, derive validation
from [the owning CI workflow](.github/workflows/validate.yml) and
[the format validator scripts](tools/format-validator/package.json) on the
current branch. Inspect their commands, Node version, and working directories;
[Local validation](README.md#local-validation) is the contributor entry point.

Inspect the current `test/*.test.mjs` inventory before selecting checks. The
workflow discovers top-level suites automatically; fixtures and nested tests
are not included. Keep new suites at that level unless deliberately updating
discovery and its regression coverage. The format validator's internal contract
probes run through its package script, not through the top-level test command.

Do not use remembered suite counts or historical command lists as validation
requirements. Investigate moved or deleted test paths in the current source
and Git history rather than recreating them to match memory. When reporting
commands, inventories, or results, identify the owning source path and checked
branch/commit, and distinguish targeted checks from the full workflow.

When adding or changing JSON in a toolkit skill's `examples/` or `assets/`
directory, follow
[Validate OpenAPI Examples](.agents/skills/validate-openapi-examples/SKILL.md).

## Required Documentation
<!--
Link to and describe any documentation that the agent must read in order to run a task.
Documentation should live in `.agents` directory.
Any of the above documentation may also live here as links.

Example:
- [Jest](.agents/tasks/jest.md)
  - **Must read for**: Instructions on how to setup the environment for any Jest tests. Read this before running jest tests.
-->