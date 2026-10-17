import { e2ePort } from './e2e-settings.ts';
// The browser suite serves only these disposable notes, never the private knowledge base.
import { mkdtemp, mkdir, writeFile, rm, copyFile } from 'node:fs/promises';
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
reading_suggestions: [second]
tags: [回归]
---
# 回归起点
这是独立测试正文。继续阅读 [[second|回归终点]]。

[[assets/demo.go|完整代码]] · [[assets/missing.go|缺失代码]]

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

## 复制格式

按 **实际能力** 分类，只开放 [[second|任务所需能力]]：

- 纯计算、格式转换。
- 读取、检索资源。
  - 嵌套能力与 \`参数\`。
- 新增、修改资源。

3. 重复内容。
4. 重复内容与 [章节](second#回归终点) 和 [外部资料](https://example.com/a?q=1&x=2)。

> 引用 **强调**。

\`\`\`ts
const marker = "\`\`\`";

const result = 1;
\`\`\`

| 能力 | 目标 |
| --- | --- |
| 读取 | [[second\\|文档]] |

- [x] 已检查
- [ ] 待检查
`,
);
await writeFile(
  path.join(root, 'notes/second.md'),
  `---
learning_status: reading
title: 回归终点
category: 验收
---
# 回归终点
终点正文。返回 [[first|回归起点]]。
`,
);
await mkdir(path.join(root, 'assets'));
await writeFile(
  path.join(root, 'assets/demo.go'),
  'package main\n// <script>window.codeExecuted = true</script>\nfunc main() {}\n',
);
try {
  await build({ root: app, mode: 'pages', build: { outDir, emptyOutDir: true } });
  const { library, assets } = await pagesLibrary(root);
  for (const [relative, file] of assets) {
    const destination = path.join(outDir, 'documents', relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(file, destination);
  }
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
