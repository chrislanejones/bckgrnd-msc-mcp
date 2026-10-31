#!/usr/bin/env node
/**
 * bckgrnd-msc-mcp: the bckgrnd-msc stem machine as an MCP server, over stdio.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, VERSION } from './server.js';
import { checkSetup } from './doctor.js';

async function main(): Promise<void> {
  if (process.argv.includes('--check') || process.argv.includes('doctor')) {
    const result = await checkSetup();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  if (process.argv.includes('--version')) { console.log(VERSION); return; }
  if (process.argv.includes('--help')) {
    console.log('bckgrnd-msc-mcp: stdio MCP server. Use --check (or doctor) to check setup, --version to show version.');
    return;
  }
  await createServer().connect(new StdioServerTransport());
  // stdout is the protocol channel; anything human-readable goes to stderr.
  console.error(`bckgrnd-msc-mcp ${VERSION} on stdio`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
