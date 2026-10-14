import type { Library } from './src/types/library.ts';
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { createHash } from 'node:crypto';
import { CONFIG } from './src/config.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createServer as createViteServer } from 'vite';
import { createReaderFrontend } from './src/reader-frontend.ts';
import { createLibraryLoader, safeAsset } from './src/library.ts';
import { activityForLibrary } from './src/activity.ts';
import {
  updateDocumentState,
  StateError,
  isLocalWriteRequest,
} from './src/update-document-state.ts';
const dir = path.dirname(fileURLToPath(import.meta.url));
export async function startServer({
  root = path.resolve(dir, '../../content'),
  port = Number(process.env.PORT || 4173),
  host = process.env.HOST || '0.0.0.0',
  optimizeDependencies = true,
  development = false,
  rebuild = false,
} = {}) {
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };
  const readLibrary = createLibraryLoader(root);
  const withActivity = async (library: Library) => ({
    ...library,
    activity: await activityForLibrary(root, library, { observe: true }),
  });
  const mime: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
  };
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname === '/api/library') {
        if (req.method !== 'GET') {
          res.writeHead(405);
          return res.end();
        }
        const library = await serialize(async () => withActivity(await readLibrary()));
        const etag =
          '"' +
          createHash('sha256')
            .update(library.version)
            .update(JSON.stringify(library.activity ?? null))
            .digest('hex') +
          '"';
        const readHeaders = { ...headers, 'Cache-Control': 'private, no-cache', ETag: etag };
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, readHeaders);
          return res.end();
        }
        res.writeHead(200, { ...readHeaders, 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(library));
      }
      if (url.pathname === '/api/documents/state') {
        if (req.method !== 'POST') {
          res.writeHead(405, headers);
          return res.end();
        }
        if (!isLocalWriteRequest(req)) {
          res.writeHead(403, headers);
          return res.end(JSON.stringify({ error: '只允许本地页面保存文档状态。' }));
        }
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 4096) throw new StateError('请求过大。', 413);
        }
        let input: unknown;
        try {
          input = JSON.parse(body);
        } catch {
          throw new StateError('请求格式无效。', 400);
        }
        const library = await serialize(async () => {
          await withActivity(await readLibrary());
          return withActivity(await updateDocumentState(root, input));
        });
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(library));
      }
      if (url.pathname === '/api/asset') {
        const asset = await safeAsset(
          root,
          url.searchParams.get('path') || '',
          url.searchParams.get('from') || '',
        );
        const type = asset && mime[path.extname(asset.file).toLowerCase()];
        if (!type) {
          res.writeHead(404, headers);
          return res.end('未找到');
        }
        res.writeHead(200, {
          ...headers,
          'Content-Type': type,
          'Content-Security-Policy': "default-src 'none'; sandbox",
        });
        return res.end(await readFile(asset.file));
      }
      if (reader) return await reader.handle(req, res);
      vite!.middlewares(req, res, () => {
        res.writeHead(404);
        res.end();
      });
    } catch (e) {
      console.error(e);
      res.writeHead(e instanceof StateError ? e.status : 500, {
        ...headers,
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          error: e instanceof StateError ? e.message : '操作失败，请检查本地终端。',
        }),
      );
    }
  });
  const reader = development ? null : await createReaderFrontend(dir, { rebuild });
  const vite = !development
    ? null
    : await createViteServer({
        root: dir,
        configFile: false,
        optimizeDeps: optimizeDependencies ? undefined : { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: { server }, fs: { allow: [dir] } },
        appType: 'spa',
      });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  }).catch(async (error) => {
    await vite?.close();
    await reader?.close();
    throw error;
  });
  return {
    server,
    frontendCacheHit: reader?.cacheHit ?? false,
    async close() {
      await vite?.close();
      if (server.listening)
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        });
      await reader?.close();
    },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const development = process.argv.includes('--dev');
  const started = performance.now();
  if (!development) console.log('正在准备稳定阅读页面…');
  const { server, close, frontendCacheHit } = await startServer({
    development,
    rebuild: process.argv.includes('--rebuild'),
  });
  if (!development)
    console.log(
      `${frontendCacheHit ? '已复用前端缓存' : '前端构建完成'} · ${((performance.now() - started) / 1000).toFixed(2)} 秒`,
    );
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      void close().then(() => process.exit(0));
    });
  const address = server.address();
  if (address && typeof address !== 'string') {
    console.log(
      `${CONFIG.brand.name} / ${CONFIG.brand.nameEn} · ${development ? '开发模式' : '稳定阅读'} · http://127.0.0.1:${address.port}`,
    );
    if (address.address === '0.0.0.0') {
      const addresses = new Set(
        Object.values(networkInterfaces())
          .flatMap((interfaces) => interfaces ?? [])
          .filter((entry) => entry.family === 'IPv4' && !entry.internal)
          .map((entry) => entry.address),
      );
      for (const ip of addresses) console.log(`局域网访问 · http://${ip}:${address.port}`);
    }
  }
}
