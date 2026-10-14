import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { build } from 'vite';
import { readerBuildKey, restoreReaderBuild, saveReaderBuild } from './reader-build-cache.ts';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

/** A private snapshot per reader process, unaffected by builds or source edits. */
export async function createReaderFrontend(appRoot: string, { rebuild = false } = {}) {
  appRoot = await realpath(appRoot);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'horizon-reader-'));
  const close = () => rm(directory, { recursive: true, force: true });
  let cacheHit = false;
  try {
    const key = await readerBuildKey(appRoot);
    cacheHit = !rebuild && (await restoreReaderBuild(appRoot, key, directory));
    if (!cacheHit) {
      await build({
        root: appRoot,
        configFile: path.join(appRoot, 'vite.config.ts'),
        mode: 'production',
        logLevel: 'warn',
        build: { outDir: directory, emptyOutDir: true },
      });
      // Edits during a build must not be cached under an earlier source snapshot.
      if ((await readerBuildKey(appRoot)) === key) await saveReaderBuild(appRoot, key, directory);
    }
  } catch (error) {
    await close();
    throw error;
  }
  return {
    cacheHit,
    close,
    async handle(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        res.end();
        return;
      }
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
      const file = path.resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(directory + path.sep)) {
        res.writeHead(404);
        res.end();
        return;
      }
      try {
        const data = await readFile(file);
        res.writeHead(200, {
          'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(req.method === 'HEAD' ? undefined : data);
      } catch (error) {
        if (!['ENOENT', 'EISDIR', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code || ''))
          throw error;
        res.writeHead(404);
        res.end('未找到');
      }
    },
  };
}
