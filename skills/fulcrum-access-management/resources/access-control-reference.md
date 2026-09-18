# Access Control Reference

## Two-Level Permission Model

Evaluate both:

1. **Role permission:** whether the membership's system/custom role permits the
   action.
2. **Resource access:** whether that membership can access the relevant app,
   project, or layer.

Owner behavior and group-derived access can change the effective result. A
direct resource removal can fail when a group still grants access.

> Source: [Role permission definitions](https://help.fulcrumapp.com/en/articles/2286638-role-permission-definitions),
> [Memberships API](https://docs.fulcrumapp.com/reference/memberships-intro),
> and [Change Permissions](https://docs.fulcrumapp.com/reference/memberships-change-permissions).

## Role Selection

Fulcrum documents Owner, Manager, Standard User, and Record Creator as system
roles with fixed permission sets. Custom roles are available on selected plans.
Reopen the system-role and pricing sources before assigning current
capabilities.

> Source: [System roles](https://help.fulcrumapp.com/en/articles/94343-what-is-the-purpose-of-the-system-role-types)
> and [Fulcrum pricing](https://www.fulcrumapp.com/pricing/).

Least-privilege review questions:

- Which exact record or management actions are required?
- Which apps, projects, and layers are required?
- Is access direct, inherited through a group, or implicit for an Owner?
- Does record assignment further limit or broaden visibility?
- Does an API token inherit more capability than the automation needs?
- Who can modify the selected role or group?

## SSO And Provisioning Boundary

SAML SSO handles authentication. SCIM provisioning manages supported user,
group, and role lifecycle through an identity provider. Plan availability and
the current setup process are time-sensitive. Converting or deprovisioning a
member can affect sessions, tokens, assignments, and integrations; plan and
test those effects.

> Source: [SSO and user provisioning](https://help.fulcrumapp.com/en/articles/4038490-how-do-i-set-up-single-sign-on-and-user-provisioning).

## References

- [Fulcrum roles collection](https://help.fulcrumapp.com/en/collections/1417535-roles)
- [Fulcrum Groups API](https://docs.fulcrumapp.com/reference/groups-api)
