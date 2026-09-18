# Plan And Licensing Check

Plan availability changes. Do not maintain a static tier matrix in this
repository.

> Source: [Fulcrum pricing](https://www.fulcrumapp.com/pricing/) is the current
> authority for plan and add-on availability.

## Check Before Designing

1. Identify the exact capability the workflow depends on.
2. Check current pricing for the organization's plan or required add-on.
3. Check the capability's public product documentation for any role, device,
   connectivity, or configuration prerequisite.
4. Separate a product limitation from a missing permission or unregistered
   connector.
5. If eligibility cannot be established, mark it unresolved and provide a
   non-destructive fallback. Do not promise access, an upgrade path, a trial, or
   feature enablement.

The capabilities most likely to require a fresh check include APIs and
webhooks, Workflows, custom roles, SSO/SCIM, advanced mapping, and AI features.
This is a verification list, not a plan matrix.

## References

- [Fulcrum pricing](https://www.fulcrumapp.com/pricing/)
- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
