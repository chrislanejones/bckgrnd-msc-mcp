// One command for an app resync: sync the bundle, re-stamp the project fixtures,
// then run every gate. Stops at the first failure. Build the app at that commit first
// (in the app: pnpm run build:engine && pnpm run build).
//
//   pnpm run resync <app-dir> --expect-commit <sha>
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const app = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--expect-commit');
const run = (cmd, ...a) => { console.log(`\n> ${cmd} ${a.join(' ')}`); execFileSync(cmd, a, { cwd: root, stdio: 'inherit' }); };
run('node', 'scripts/sync-engine.mjs', ...args);
run('node', 'scripts/stamp-project-fixtures.mjs');
run('pnpm', 'run', 'typecheck');
run('pnpm', 'run', 'lint');
run('pnpm', 'test');
run('node', 'scripts/verify-parity.mjs', ...(app ? [app] : []), '--baseline', '.vendor-previous');
run('pnpm', 'run', 'test:package');
console.log('\nResync gates passed. Review git diff vendor/ test/fixtures/, then commit.');
