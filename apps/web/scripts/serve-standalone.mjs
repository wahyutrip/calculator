/**
 * Serve the standalone build exactly the way the Docker image does.
 *
 * `next start` does not work with `output: 'standalone'` — Next says so itself.
 * More importantly, standalone does NOT trace `.next/static` or `public/`, so
 * copying them here reproduces the one packaging mistake that breaks the PWA
 * while leaving the app looking perfectly healthy.
 *
 *   node scripts/serve-standalone.mjs
 */
import { cp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, '..');
const standaloneApp = join(appDir, '.next', 'standalone', 'apps', 'web');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standaloneApp))) {
  console.error('No standalone build found. Run `pnpm build` first.');
  process.exit(1);
}

await cp(join(appDir, '.next', 'static'), join(standaloneApp, '.next', 'static'), {
  recursive: true,
});
await cp(join(appDir, 'public'), join(standaloneApp, 'public'), { recursive: true });

const child = spawn(process.execPath, [join(standaloneApp, 'server.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.WEB_PORT ?? process.env.PORT ?? '3101',
    HOSTNAME: '0.0.0.0',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
