import { e2ePort } from './e2e-settings.ts';
// The browser suite serves only these disposable notes, never the private knowledge base.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { pagesLibrary } from './build-pages.ts';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(os.tmpdir(), 'horizon-browser-'));
const root = path.join(temp, 'content'),
  outDir = path.join(temp, 'site');
await mkdir(path.join(root, 'readings'), { recursive: true });
await mkdir(path.join(root, 'notes'), { recursive: true });
await writeFile(
  path.join(root, 'notes/first.md'),
  `---
title: 回归起点
category: 验收
aliases: [自动化入口]
tags: [回归]
---
# 回归起点
这是独立测试正文。继续阅读 [[second|回归终点]]。

\`\`\`mermaid
flowchart LR
  Start --> Finish
\`\`\`

\`\`\`mermaid
sequenceDiagram
  User->>Reader: Open
  Reader-->>User: Document
\`\`\`

\`\`\`mermaid
packet-beta
0-15: "Source Port"
16-31: "Destination Port"
\`\`\`

\`\`\`mermaid
---
config:
  layout: elk
---
flowchart TD
  Start --> Finish
\`\`\`
`,
);
await writeFile(
  path.join(root, 'notes/second.md'),
  `---
title: 回归终点
learning_status: understood
category: 验收
---
# 回归终点
终点正文。返回 [[first|回归起点]]。
`,
);
try {
  await build({ root: app, mode: 'pages', build: { outDir, emptyOutDir: true } });
  const { library } = await pagesLibrary(root);
  await writeFile(path.join(outDir, 'library.json'), JSON.stringify(library));
  const server = await preview({
    root: app,
    mode: 'pages',
    build: { outDir },
    preview: { host: '127.0.0.1', port: e2ePort, strictPort: true },
  });
  const close = async () => {
    server.httpServer.close();
    await rm(temp, { recursive: true, force: true });
    process.exit(0);
  };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
} catch (error) {
  await rm(temp, { recursive: true, force: true });
  throw error;
}
