# App Extension Asset Index

| File | What it holds | Public source |
| --- | --- | --- |
| [`app-mcp-extension-publish-sequence.txt`](app-mcp-extension-publish-sequence.txt) | Canonical publishing sequence: review and approve before either live write, then fresh-read/reconcile before the script update. | [App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction) |
| [`cdn-version-pinning.html`](cdn-version-pinning.html) | Unpinned versus pinned external script references. | [Offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities) |

An external asset is both an offline and a supply-chain risk. Inline what an
offline workflow needs, and pin an exact semver version otherwise. Extension
pages and Data Event triggers are indexed in
[`examples/README.md`](../examples/README.md).
