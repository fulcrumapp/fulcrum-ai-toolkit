# App Builder Asset Index

| File | What it holds | Public source |
| --- | --- | --- |
| [`app-build-sequence.txt`](app-build-sequence.txt) | Canonical new-form workflow: build, validate, review the score/performance advice, obtain approval, then create. | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) |

This sequence is for new forms only. Existing forms use
[the builder's gated update workflow](../SKILL.md#step-4-build-or-hand-off) and
[pre-write freshness safeguard](../resources/pre-write-freshness.md).
[`forms-update-preserving-keys.js`](../examples/forms-update-preserving-keys.js)
is a payload-only fragment, not a standalone workflow or permission to write.
