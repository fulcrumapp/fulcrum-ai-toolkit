---
name: fulcrum-access-management
description: Design least-privilege Fulcrum access. Use for system and custom roles, role-versus-resource permissions, memberships, groups, App MCP role/member inspection, SSO, SCIM, provisioning, and current plan checks.
---

# Fulcrum Access Management

Model who may do what to which resources, verify current identity and plan
boundaries, and separate read-only inspection from access mutation.

## When To Use

Use this skill for system/custom role selection, app/project/layer access,
membership and group reasoning, API-token privilege, SAML SSO, SCIM
provisioning, onboarding/offboarding, and least-privilege reviews.

## When Not To Use

- Use [`fulcrum-data-migration`](../fulcrum-data-migration/SKILL.md) for a
  broader data/identity cutover plan.
- Use [`fulcrum-integration-patterns`](../fulcrum-integration-patterns/SKILL.md)
  for service authentication and webhook delivery.
- Do not use this public skill for tenant-specific identities, private access
  paths, SSO metadata, tokens, or support-coordination runbooks.

## Source Order

1. Live App MCP schemas for registered read-only membership/role operations.
2. Current public role and permission docs for product behavior.
3. Current public Memberships/Groups API docs for resource-access behavior.
4. Current SSO/SCIM docs and pricing for identity-provider and plan boundaries.

> Source: [System roles](https://help.fulcrumapp.com/en/articles/94343-what-is-the-purpose-of-the-system-role-types),
> [role permissions](https://help.fulcrumapp.com/en/articles/2286638-role-permission-definitions),
> and [SSO/provisioning](https://help.fulcrumapp.com/en/articles/4038490-how-do-i-set-up-single-sign-on-and-user-provisioning).

## Workflow

1. **Describe the actor and task.** Use role/persona labels, never real
   identities in public artifacts.
2. **Build the two-level model.** Determine the role permission required for the
   action, then the app/project/layer access required for the resource.
3. **Account for inheritance.** Check Owner behavior, groups, direct membership,
   default roles, record assignment, and token ownership before proposing a
   change.
4. **Inspect current state.** Use
   [`access-control-reference.md`](resources/access-control-reference.md) and an
   authorized read-only inventory. Redact names and emails from shared output.
5. **Design least privilege.** Prefer the smallest role and resource set that
   completes the task. Separate human, automation, emergency, and audit access.
6. **Review identity lifecycle.** For SSO/SCIM, define joiner/mover/leaver
   behavior, role/group mapping, break-glass ownership, deprovisioning,
   reassignment, token rotation, and test users.
7. **Approve and verify.** Obtain explicit confirmation for grants, removals,
   role changes, group changes, provisioning activation, or deprovisioning.
   Verify effective access and loss-of-access behavior.

## App MCP Handoff

When the live schema matches the settled contract,
`fulcrum_memberships_list` and `fulcrum_roles_list` provide read-only
organization membership and role/permission inspection. App MCP does not expose
membership mutation, role mutation, resource permission changes, SSO, or SCIM
configuration. Use the supported Fulcrum UI or a separately authorized public
API workflow for approved changes.

> Connector authority: Live installed App MCP schemas take precedence over
> toolkit prose.

## Confirmation, Privacy, And Failure

Treat access grants and removals as consequential; removals can interrupt field
work and integrations. Never expose membership exports, emails, SAML metadata,
SCIM tokens, API tokens, or customer role maps in public content.

If effective access cannot be explained from role plus resource permissions,
stop and identify group inheritance, plan eligibility, or unsupported connector
scope as unresolved. Never broaden access as a fallback, silently skip a failed
removal, or claim deprovisioning is complete without an effective-access check.

## References

- [System roles](https://help.fulcrumapp.com/en/articles/94343-what-is-the-purpose-of-the-system-role-types)
- [Role permission definitions](https://help.fulcrumapp.com/en/articles/2286638-role-permission-definitions)
- [Memberships API](https://docs.fulcrumapp.com/reference/memberships-intro)
- [Change membership permissions](https://docs.fulcrumapp.com/reference/memberships-change-permissions)
- [SSO and user provisioning](https://help.fulcrumapp.com/en/articles/4038490-how-do-i-set-up-single-sign-on-and-user-provisioning)
