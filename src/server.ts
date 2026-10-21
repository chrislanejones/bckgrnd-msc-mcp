import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.js';
import { registerPreview } from './preview.js';

export const VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version;

export function createServer(): McpServer {
  const server = new McpServer({ name: 'bckgrnd-msc', version: VERSION });
  registerTools(server);
  registerPreview(server);
  return server;
}
