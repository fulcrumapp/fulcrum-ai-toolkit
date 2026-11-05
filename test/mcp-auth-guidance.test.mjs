import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compact = (text) => text.replace(/\s+/g, ' ');
const builderRoot = 'plugins/fulcrum-ai-toolkit/skills/fulcrum-app-builder';
const guide = compact(read(`${builderRoot}/resources/mcp-setup.md`));
const surfaces = [
  `${builderRoot}/SKILL.md`,
  'plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/SKILL.md',
  'README.md',
  'plugins/fulcrum-ai-toolkit/docs/host-installation.md'
];

test('connection guidance prefers compatible OAuth while preserving API tokens', () => {
  for (const path of surfaces) {
    const text = compact(read(path));
    assert.match(text, /prefer OAuth/i, path);
    assert.match(text, /(?:compatible|supports? it|where supported)/i, path);
    assert.match(text, /API token/i, path);
    assert.doesNotMatch(text, /OAuth (?:login )?is not supported|OAuth-only connector UI is not compatible/i, path);
  }
  assert.match(guide, /Prefer OAuth when the host supports OAuth/);
  assert.match(guide, /without a static authorization header/);
  assert.match(guide, /sign in to the selected Fulcrum instance/);
  assert.match(guide, /consent to the requested access/);
  assert.match(guide, /metadata discovery alone does not prove that a client can complete the flow/);
  assert.match(guide, /Do not replace or remove an existing working token configuration/);
  assert.match(guide, /Authorization: Bearer <token>/);
  assert.match(guide, /--bearer-token-env-var FULCRUM_API_TOKEN/);
  assert.match(guide, /codex mcp login fulcrum-app/);
});

test('both authentication paths retain tenant, safety and verification safeguards', () => {
  assert.match(guide, /If the region is unknown, ask the organization administrator and stop/);
  assert.match(guide, /Never try credentials against multiple regions/);
  assert.match(guide, /Confirm the intended organization before live work/);
  assert.match(guide, /For either method, choose the least-privileged authorized account/);
  assert.match(guide, /Never paste OAuth credentials, authorization codes, or tokens into chat/);
  assert.match(guide, /authorized read-only operation exposed by the live schema/);
  assert.match(guide, /Do not create a disposable form as a connection test/);
  assert.match(guide, /Never automatically change regions, broaden permissions/);
  assert.match(guide, /report a successful connection after a failure/);
});
