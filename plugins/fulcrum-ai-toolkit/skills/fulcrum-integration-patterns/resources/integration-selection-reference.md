# Integration Selection Reference

Choose from current supported behavior, not from a memorized feature matrix.

| Need | Start with | Boundary to verify |
| --- | --- | --- |
| Conditional, app-scoped action after a record event | Workflow | Current triggers, step types, bulk/import behavior, permissions, and plan access |
| Organization event delivery to an HTTPS receiver | Global webhook | Event coverage, payload, endpoint response contract, retries, authenticity strategy, and activation scope |
| Open, create, or edit a record from a link | URL Action | Supported platform, action, field types, permissions, validation, and unsaved-record behavior |
| Read or mutate supported resources under a service identity | REST API integration | Current endpoint, token scope, regional base URL, rate/timeout behavior, and mutation semantics |
| Mapping, fan-out, durable retries, secret handling, or multi-system orchestration | Controlled middleware | Operational owner, queue, idempotency, observability, replay, and data-retention policy |
| Scheduled change detection without a suitable event | Polling | Query/filter support, cursor/watermark, rate budget, overlap, and reconciliation |

> Source: [What are Workflows?](https://help.fulcrumapp.com/en/articles/5137763-what-are-workflows),
> [Webhooks](https://docs.fulcrumapp.com/docs/webhooks),
> [URL Actions](https://docs.fulcrumapp.com/docs/url-actions), and the
> [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro).

## Delivery Review

- Accept and acknowledge events within the currently documented endpoint
  contract; queue slow work outside the request.
- Assume duplicates are possible and make consumers idempotent.
- Establish whether Fulcrum or middleware owns retries; never stack retry loops
  without a bounded policy.
- Validate payload shape from a safe test event. Fetch canonical data through an
  authenticated API when webhook authenticity or payload completeness is
  insufficient.
- Minimize outbound fields, redact logs, rotate secrets, and document where data
  is retained.
- Reconcile destination state against Fulcrum after outages or dead-letter
  events.

> Source: [Webhooks responsibilities, retries, and security](https://docs.fulcrumapp.com/docs/webhooks).

## References

- [Workflows API](https://docs.fulcrumapp.com/reference/workflows-api)
- [Webhooks API](https://docs.fulcrumapp.com/reference/webhooks-intro)
- [Fulcrum public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
