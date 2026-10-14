import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

// Content hashes catch deletions and edits that preserve file size or timestamps.
async function hashPaths(root: string, paths: string[]) {
  const hash = createHash('sha256');
  async function visit(relative: string): Promise<void> {
    const file = path.join(root, relative);
    const info = await stat(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    hash.update(JSON.stringify([relative, info?.isDirectory() ?? null]));
    if (!info) return;
    if (info.isDirectory()) {
      for (const name of (await readdir(file)).sort()) await visit(path.join(relative, name));
    } else {
      hash.update(
        createHash('sha256')
          .update(await readFile(file))
          .digest(),
      );
    }
  }
  for (const relative of paths.sort()) await visit(relative);
  return hash.digest('hex');
}

export async function readerBuildKey(appRoot: string) {
  const files = (await readdir(appRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && !entry.name.endsWith('.md'))
    .map((entry) => entry.name);
  const inputs = await hashPaths(appRoot, [
    ...files,
    'src',
    'public',
    'scripts',
    'licenses',
    'node_modules/.package-lock.json',
  ]);
  const environment = Object.entries({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
  })
    .filter(([key]) => key.startsWith('VITE_') || key === 'NODE_ENV')
    .sort(([a], [b]) => a.localeCompare(b));
  return createHash('sha256')
    .update(
      JSON.stringify([1, inputs, process.version, process.platform, process.arch, environment]),
    )
    .digest('hex');
}

const cacheRoot = (root: string) => path.join(root, 'node_modules/.cache/horizon-reader');

export async function restoreReaderBuild(root: string, key: string, directory: string) {
  const cached = path.join(cacheRoot(root), key);
  try {
    const expected = await readFile(path.join(cached, 'checksum'), 'utf8');
    await cp(path.join(cached, 'frontend'), directory, { recursive: true });
    if ((await hashPaths(directory, ['.'])) !== expected) throw new Error('Incomplete cache');
    await readFile(path.join(directory, 'index.html'));
    return true;
  } catch {
    // A deleted, damaged or unavailable cache must never prevent a fresh build.
    await rm(cached, { recursive: true, force: true }).catch(() => {});
    await rm(directory, { recursive: true, force: true });
    await mkdir(directory, { recursive: true });
    return false;
  }
}

export async function saveReaderBuild(root: string, key: string, directory: string) {
  let staging: string | undefined;
  try {
    const parent = cacheRoot(root);
    await mkdir(parent, { recursive: true });
    staging = await mkdtemp(path.join(parent, '.building-'));
    await cp(directory, path.join(staging, 'frontend'), { recursive: true });
    await writeFile(path.join(staging, 'checksum'), await hashPaths(directory, ['.']));
    // Publish only complete builds. Concurrent readers may publish the same key first.
    await rm(path.join(parent, key), { recursive: true, force: true });
    await rename(staging, path.join(parent, key));
  } catch {
    // Cache writes are optional; the private frontend remains usable.
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true }).catch(() => {});
  }
}
