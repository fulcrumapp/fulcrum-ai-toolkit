import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createCanvas, CanvasError, joinSession } from '@github/copilot-sdk/extension';
import { buildGraph, initialNodes, withDuplicateCheck } from './graph.mjs';

const servers = new Map();
const html = await readFile(new URL('./index.html', import.meta.url));
const script = await readFile(new URL('./ui.js', import.meta.url));
const graphScript = await readFile(new URL('./graph.mjs', import.meta.url));
const style = await readFile(new URL('./style.css', import.meta.url));
let session;
let store;
let writes = Promise.resolve();

async function load() {
  try {
    const data = JSON.parse(await readFile(store, 'utf8'));
    return { revision: data.revision, nodes: buildGraph(data.nodes).nodes };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { revision: 0, nodes: buildGraph(initialNodes).nodes };
  }
}

async function save(nodes, revision) {
  const graph = buildGraph(nodes);
  withDuplicateCheck(graph.nodes);
  const task = writes.then(async () => {
    const current = await load();
    if (revision !== current.revision) throw new Error('The diagram changed elsewhere. Reload before saving.');
    const result = { revision: revision + 1, nodes: graph.nodes };
    await mkdir(dirname(store), { recursive: true });
    const temp = `${store}.${randomBytes(8).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify(result, null, 2), { mode: 0o600 });
    await rename(temp, store);
    return result;
  });
  writes = task.catch(() => {});
  return task;
}

async function startServer() {
  const token = randomBytes(24).toString('hex');
  const server = createServer(async (req, res) => {
    const send = (status, type, body) => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === `/${token}/`) return send(200, 'text/html; charset=utf-8', html);
      if (req.method === 'GET' && path === `/${token}/ui.js`) return send(200, 'text/javascript; charset=utf-8', script);
      if (req.method === 'GET' && path === `/${token}/graph.mjs`) return send(200, 'text/javascript; charset=utf-8', graphScript);
      if (req.method === 'GET' && path === `/${token}/style.css`) return send(200, 'text/css; charset=utf-8', style);
      if (req.method === 'GET' && path === `/${token}/state`) return send(200, 'application/json', JSON.stringify(await load()));
      if (req.method === 'POST' && path === `/${token}/state`) {
        const origin = req.headers.origin;
        if (origin && origin !== `http://127.0.0.1:${server.address().port}`) return send(403, 'text/plain', 'Forbidden');
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 65536) return send(413, 'text/plain', 'Request too large');
        }
        const input = JSON.parse(body);
        return send(200, 'application/json', JSON.stringify(await save(input.nodes, input.revision)));
      }
      send(404, 'text/plain', 'Not found');
    } catch (error) {
      send(400, 'application/json', JSON.stringify({ error: error.message }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}/${token}/` };
}

session = await joinSession({
  canvases: [createCanvas({
    id: 'flow-diagram-prototype',
    displayName: 'FLOW diagram prototype',
    description: 'Edit a FLOW diagram with function, agentic, and decision nodes.',
    inputSchema: { type: 'object', additionalProperties: false },
    actions: [{
      name: 'get_graph',
      description: 'Read the saved prototype FLOW graph and revision.',
      handler: async () => {
        const state = await load();
        return { revision: state.revision, graph: withDuplicateCheck(state.nodes) };
      },
    }, {
      name: 'set_graph',
      description: 'Replace the saved prototype graph after checking its revision.',
      inputSchema: {
        type: 'object',
        properties: { revision: { type: 'integer', minimum: 0 }, nodes: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'object' } } },
        required: ['revision', 'nodes'],
        additionalProperties: false,
      },
      handler: async ({ input }) => {
        try {
          const state = await save(input.nodes, input.revision);
          return { revision: state.revision, graph: buildGraph(state.nodes) };
        } catch (error) {
          throw new CanvasError('invalid_graph', error.message);
        }
      },
    }],
    open: async ({ instanceId }) => {
      if (!session.workspacePath) throw new CanvasError('missing_workspace', 'Session artifact storage is unavailable.');
      store = join(session.workspacePath, 'flow-diagram-prototype', 'graph.json');
      let entry = servers.get(instanceId);
      if (!entry) {
        entry = await startServer();
        servers.set(instanceId, entry);
      }
      return { title: 'FLOW diagram prototype', url: entry.url };
    },
    onClose: async ({ instanceId }) => {
      const entry = servers.get(instanceId);
      if (entry) {
        servers.delete(instanceId);
        await new Promise(resolve => entry.server.close(resolve));
      }
    },
  })],
});
