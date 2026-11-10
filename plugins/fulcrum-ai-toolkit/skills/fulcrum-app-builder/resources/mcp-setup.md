# Regional Fulcrum MCP Setup

Fulcrum hosts a federated MCP gateway separately from this skill bundle. The
same endpoint provides App MCP configuration tools and Query MCP read-only
query tools when advertised by the live schema. Connect only when the user
requests live Fulcrum access; guidance and an approved implementation handoff
do not need credentials or a connector.

Existing endpoint URLs, authentication behavior, client aliases such as
`fulcrum-app`, and the `FULCRUM_APP_MCP_URL` environment-variable convention
remain valid. These are client-side labels for the same endpoint; federation
happens server-side, so existing installations need no configuration migration.

## Choose The Tenant's Instance

Ask which Fulcrum instance holds the target organization, or confirm it from
the user's existing Fulcrum sign-in host. Do not infer it from language,
physical location, or the agent machine's region.

| Tenant instance | Fulcrum domain | Fulcrum MCP endpoint |
| --- | --- | --- |
| US / default instance | `fulcrumapp.com` | `https://mcp.fulcrumapp.com` |
| Australia | `fulcrumapp-au.com` | `https://mcp.fulcrumapp-au.com` |
| Europe | `fulcrumapp-eu.com` | `https://mcp.fulcrumapp-eu.com` |
| Canada | `fulcrumapp-ca.com` | `https://mcp.fulcrumapp-ca.com` |

Use the selected endpoint without an additional path. These are MCP endpoints,
not the REST API's `api.<domain>/api/v2/` endpoints. "Default instance" names
the US service; it is not permission to default an unknown tenant to that
endpoint.

> Source: The public [Fulcrum MCP service](https://mcp.fulcrumapp.com) and its
> regional endpoints above provide the connector. [Fulcrum regional-instance
> documentation](https://docs.fulcrumapp.com/reference/working-with-other-instances)
> describes the corresponding Fulcrum instance domains and REST distinction.

If the region is unknown, ask the organization administrator and stop at
guidance. Never try credentials against multiple regions to discover their
tenant. A connection failure is not permission to switch regions.

## Choose Authentication

Prefer OAuth when the host supports OAuth for remote HTTP MCP and is compatible
with the service. Configure the selected endpoint without a static
authorization header, start the host's connection or sign-in flow, and sign in
to the selected Fulcrum instance with the intended account. Review and consent
to the requested access in the host's authorization flow. Confirm the intended
organization before live work; a successful sign-in alone does not establish
which organization's resources are in use.

Host OAuth support varies by client, version, and policy. Follow the host's
current instructions; metadata discovery alone does not prove that a client
can complete the flow. Do not replace or remove an existing working token
configuration merely to enable OAuth.

An opaque organization API token is a supported alternative when OAuth is
unavailable or the existing configuration should be retained. Manage tokens
in the selected instance's Fulcrum API settings. For either method, choose
the least-privileged authorized account appropriate to the work. The API
token carries that account's access within its organization. Do not request
broader access just to make a failed operation succeed.

> Source: [Fulcrum API authentication](https://docs.fulcrumapp.com/reference/rest-api-auth)
> documents organization-specific API tokens and their access.

For the API-token alternative, the token is the same kind used by the REST API,
but the header differs:
REST documents `X-ApiToken`; App MCP uses `Authorization: Bearer <token>`.
Do not send the token in a query parameter, decode it as a JWT, paste it into
chat, or commit it to a repository.

Never paste OAuth credentials, authorization codes, or tokens into chat or
commit them to a repository. Let the host manage OAuth credentials securely.
For API-token authentication, store the token in the client's secret store or
supply `FULCRUM_API_TOKEN` through the environment of the agent process. Set
`FULCRUM_APP_MCP_URL` to exactly the endpoint selected above, with no default.
Environment-variable names are conventions for the examples below, not server
requirements. An environment variable only works if the host process can read it.

## Configure The Host

Use the host's remote HTTP / Streamable HTTP MCP transport. Preserve unrelated
servers and settings; get approval before changing a user's configuration.
The toolkit's `mcp.json` and `.mcp.json` intentionally register no servers, so
installing the bundle cannot select a tenant or transmit a token.

For OAuth, configure only the selected endpoint in the host's remote MCP
settings, with no static authorization header, then use its supported sign-in
action and complete Fulcrum login and consent. The client must support the
service's OAuth flow; if sign-in fails, report the failure rather than claiming
the connection succeeded. If the host is incompatible, use the API-token
alternative only when it supports a secure authorization header, or continue
with a connector-free handoff.

### Claude Code

For the API-token alternative, after selecting the instance, merge this server
entry into the consuming project's `.mcp.json` if project-scoped configuration
is desired:

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
literal secret. For OAuth, omit the `headers` block and use the host's sign-in
flow if supported.

### Codex

For the API-token alternative, with the selected URL and token supplied to the
client environment, register the server without putting the token in a command
argument:

```bash
codex mcp add fulcrum-app \
  --url "${FULCRUM_APP_MCP_URL:?Select the tenant MCP endpoint first}" \
  --bearer-token-env-var FULCRUM_API_TOKEN
```

Codex stores the URL and the token's environment-variable name, not its value.
Keep `FULCRUM_API_TOKEN` available when running Codex. For OAuth, register the
selected URL without `--bearer-token-env-var`, then use
`codex mcp login fulcrum-app` if supported by the installed version.

### Other Hosts

In Copilot, Cursor, Gemini, Hermes, or another MCP client, configure the
selected endpoint through that host's documented remote MCP settings. Use its
OAuth sign-in if compatible; for the API-token alternative, use its own
secret-input or environment-reference syntax for the Bearer header. Claude's
`${...}` JSON expansion is not a portable MCP feature.

If neither authentication method works securely or the host cannot connect to
remote HTTP MCP, use a compatible host or continue with the connector-free
handoff. Do not add a public credential proxy or claim that installing skills
alone enables live actions.

## Confirm Before Live Work

1. Review the selected endpoint and intended organization with the user
   without displaying credentials.
2. Check the host's MCP connection status and inspect the registered tool
   schemas. A reachable URL or HTTP 401 alone does not prove a working
   authenticated connection.
3. Use an authorized read-only operation exposed by the live schema to
   confirm the intended organization's resources before proposing a write.
   Query MCP `form_summaries` is suitable when advertised. Do not create a
   disposable form as a connection test.
4. Obtain schema/change approval before mutation and separate explicit
   confirmation for destructive changes.

For 401, check the OAuth sign-in and consent or the API-token source and Bearer
header, as appropriate. For 403, check the account's permissions. For transport
failures, check the exact endpoint, transport, and host support. Keep all
diagnostics redacted. Never automatically change
regions, broaden permissions, retry destructive operations, or report a
successful connection after a failure.

When working with multiple organizations, keep credential/endpoint
configurations distinct and confirm which one the active connector uses.
Account location and organization identity are separate decisions.

## References

- [Fulcrum API authentication](https://docs.fulcrumapp.com/reference/rest-api-auth)
- [Fulcrum regional instances](https://docs.fulcrumapp.com/reference/working-with-other-instances)
- [Claude Code MCP configuration](https://code.claude.com/docs/en/mcp)
- [Codex MCP configuration](https://developers.openai.com/codex/mcp/)
- [Return to the app-building workflow](../SKILL.md)
