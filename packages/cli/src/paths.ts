import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { stat } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getWebDistPath(): Promise<string> {
  // Strategy 1: Monorepo development (relative to cli/dist/)
  const devPath = resolve(__dirname, '..', '..', 'web', 'dist');
  try {
    await stat(join(devPath, 'index.html'));
    return devPath;
  } catch {
    // fall through
  }

  // Strategy 2: Bundled within cli package (published)
  const bundledPath = resolve(__dirname, '..', 'web-dist');
  try {
    await stat(join(bundledPath, 'index.html'));
    return bundledPath;
  } catch {
    // fall through
  }

  throw new Error(
    'Could not find web UI assets. Run "pnpm build" in packages/web first.',
  );
}
