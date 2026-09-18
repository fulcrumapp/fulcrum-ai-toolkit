# Regional Fulcrum App MCP Setup

Fulcrum hosts App MCP separately from this skill bundle. Connect only when the
user requests live Fulcrum access; guidance and an approved implementation
handoff do not need credentials or a connector.

## Choose The Tenant's Instance

Ask which Fulcrum instance holds the target organization, or confirm it from
the user's existing Fulcrum sign-in host. Do not infer it from language,
physical location, or the agent machine's region.

| Tenant instance | Fulcrum domain | App MCP endpoint |
| --- | --- | --- |
| US / default instance | `fulcrumapp.com` | `https://mcp.fulcrumapp.com/app` |
| Australia | `fulcrumapp-au.com` | `https://mcp.fulcrumapp-au.com/app` |
| Europe | `fulcrumapp-eu.com` | `https://mcp.fulcrumapp-eu.com/app` |
| Canada | `fulcrumapp-ca.com` | `https://mcp.fulcrumapp-ca.com/app` |

Keep the `/app` path. These are MCP endpoints, not the REST API's
`api.<domain>/api/v2/` endpoints. "Default instance" names the US service;
it is not permission to default an unknown tenant to that endpoint.

> Source: The public [App MCP service](https://mcp.fulcrumapp.com/app) and its
> regional endpoints above provide the connector. [Fulcrum regional-instance
> documentation](https://docs.fulcrumapp.com/reference/working-with-other-instances)
> describes the corresponding Fulcrum instance domains and REST distinction.

If the region is unknown, ask the organization administrator and stop at
guidance. Never try the same token against multiple regions to discover its
tenant. A connection failure is not permission to switch regions.

## Authenticate With An Organization API Token

Use the existing opaque Fulcrum API token for the intended organization on
the selected instance. App MCP expects the token in the `Authorization`
header with the `Bearer` scheme. It does not support OAuth login.

Manage tokens in the selected instance's Fulcrum API settings. Choose the
least-privileged authorized account appropriate to the work; the token carries
that account's access within its organization. Do not request broader access
just to make a failed operation succeed.

> Source: [Fulcrum API authentication](https://docs.fulcrumapp.com/reference/rest-api-auth)
> documents organization-specific API tokens and their access. The hosted
> [App MCP endpoint](https://mcp.fulcrumapp.com/app) requires Bearer authentication.

The token is the same kind used by the REST API, but the header differs:
REST documents `X-ApiToken`; App MCP uses `Authorization: Bearer <token>`.
Do not send the token in a query parameter, decode it as a JWT, paste it into
chat, or commit it to a repository.

Store the token in the client's secret store or supply `FULCRUM_API_TOKEN`
through the environment of the agent process. Set `FULCRUM_APP_MCP_URL` to
exactly the endpoint selected above, with no default. Environment-variable
names are conventions for the examples below, not server requirements.
An environment variable only works if the host process can read it.

## Configure The Host

Use the host's remote HTTP / Streamable HTTP MCP transport. Preserve unrelated
servers and settings; get approval before changing a user's configuration.
The toolkit's `mcp.json` and `.mcp.json` intentionally register no servers, so
installing the bundle cannot select a tenant or transmit a token.

### Claude Code

After selecting the instance, merge this server entry into the consuming
project's `.mcp.json` if project-scoped configuration is desired:

```json
{
  "mcpServers": {
    "fulcrum-app": {
      "type": "http",
      "url": "${FULCRUM_APP_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${FULCRUM_API_TOKEN}"
      }
    }
  }
}
```

Keep the `${...}` references literal in the file; Claude resolves them from
its environment. Supply both variables before starting the client and approve
the project server when prompted. Do not replace the token reference with a
literal secret or invoke an OAuth login flow.

### Codex

With the selected URL and token supplied to the client environment, register
the server without putting the token in a command argument:

```bash
codex mcp add fulcrum-app \
  --url "${FULCRUM_APP_MCP_URL:?Select the tenant MCP endpoint first}" \
  --bearer-token-env-var FULCRUM_API_TOKEN
```

Codex stores the URL and the token's environment-variable name, not its value.
Keep `FULCRUM_API_TOKEN` available when running Codex. Do not use
`codex mcp login` for this service; that command is for OAuth servers.

### Other Hosts

In Copilot, Cursor, Gemini, Hermes, or another MCP client, configure the same
selected endpoint and Bearer header through that host's documented remote
MCP settings. Use its own secret-input or environment-reference syntax;
Claude's `${...}` JSON expansion is not a portable MCP feature.

If a host only offers OAuth connectors, cannot provide an authorization
header securely, or cannot connect to remote HTTP MCP, use a compatible host
or continue with the connector-free handoff. Do not add a public credential
proxy or claim that installing skills alone enables live actions.

## Confirm Before Live Work

1. Review the selected endpoint and intended organization with the user
   without displaying the token.
2. Check the host's MCP connection status and inspect the registered tool
   schemas. A reachable URL or HTTP 401 alone does not prove a working
   authenticated connection.
3. Use an authorized read-only operation exposed by the live schema to
   confirm the intended organization's resources before proposing a write.
   Do not create a disposable form as a connection test.
4. Obtain schema/change approval before mutation and separate explicit
   confirmation for destructive changes.

For 401, check the token source and Bearer header. For 403, check the account's
permissions. For transport failures, check the exact endpoint, transport, and
host support. Keep all diagnostics redacted. Never automatically change
regions, broaden permissions, retry destructive operations, or report a
successful connection after a failure.

When working with multiple organizations, keep token/endpoint configurations
distinct and confirm which one the active connector uses. Account location
and organization identity are separate decisions.

## References

- [Fulcrum API authentication](https://docs.fulcrumapp.com/reference/rest-api-auth)
- [Fulcrum regional instances](https://docs.fulcrumapp.com/reference/working-with-other-instances)
- [Claude Code MCP configuration](https://code.claude.com/docs/en/mcp)
- [Codex MCP configuration](https://developers.openai.com/codex/mcp/)
- [Return to the app-building workflow](../SKILL.md)
