import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ejs = require('../tools/format-validator/node_modules/ejs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templates = [
  'plugins/fulcrum-ai-toolkit/skills/fulcrum-report-building/examples/query-related-records.ejs',
  'skills/fulcrum-report-building/examples/query-related-records.ejs'
];
const unavailableSiteIds = [
  ['missing field', null],
  ['missing value', { name: 'site_id', value: undefined }],
  ['null value', { name: 'site_id', value: null }],
  ['empty value', { name: 'site_id', value: '' }]
];

function render(templatePath, siteIdField) {
  let queryCount = 0;
  let queryText;
  const html = ejs.render(fs.readFileSync(path.join(root, templatePath), 'utf8'), {
    record: {
      formValues: {
        find(name) {
          return name === 'site_id' ? siteIdField : null;
        }
      }
    },
    QUERY(sql) {
      queryCount += 1;
      queryText = sql;
      return { rows: [] };
    }
  });
  return { html, queryCount, queryText };
}

test('related-record templates reject unavailable site IDs without querying', () => {
  for (const templatePath of templates) {
    for (const [label, siteIdField] of unavailableSiteIds) {
      const { html, queryCount } = render(templatePath, siteIdField);
      assert.equal(queryCount, 0, `${templatePath}: ${label}`);
      assert.match(html, /site_id is required\.[\s\S]*No query was run\./);
    }
  }
});

test('related-record templates query with a present valid site ID', () => {
  for (const templatePath of templates) {
    const { queryCount, queryText } = render(templatePath, {
      name: 'site_id',
      value: 'site-123_4'
    });
    assert.equal(queryCount, 1, templatePath);
    assert.match(queryText, /WHERE site_id = 'site-123_4'/);
  }
});
