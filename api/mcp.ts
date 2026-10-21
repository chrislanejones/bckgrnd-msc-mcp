import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createRemoteServer } from '../src/remote.js';

const MAX_REQUEST_BYTES = 3 * 1024 * 1024;

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const token = process.env.BCKGRND_MSC_API_TOKEN;
  if (token) {
    const actual = Buffer.from(req.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      res.writeHead(401).end('Unauthorized');
      return;
    }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.writeHead(405).end('Use MCP Streamable HTTP POST requests.');
    return;
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        res.writeHead(403).end('Cross-origin browser requests are not supported.');
        return;
      }
    } catch {
      res.writeHead(403).end('Invalid origin');
      return;
    }
  }
  let body: unknown;
  try {
    if (req.body !== undefined) {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (Buffer.byteLength(raw) > MAX_REQUEST_BYTES) { res.writeHead(413).end('Request too large'); return; }
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > MAX_REQUEST_BYTES) { res.writeHead(413).end('Request too large'); return; }
        chunks.push(bytes);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    }
  } catch {
    res.writeHead(400).end('Invalid JSON');
    return;
  }
  const server = createRemoteServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } finally {
    await server.close();
  }
}
