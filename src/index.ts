#!/usr/bin/env node
/**
 * bckgrnd-msc-mcp: the bckgrnd-msc stem machine as an MCP server, over stdio.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, VERSION } from './server.js';

async function main(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
  // stdout is the protocol channel; anything human-readable goes to stderr.
  console.error(`bckgrnd-msc-mcp ${VERSION} on stdio`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
