---
parent: codex-sandbox-overview
title: "Codex 如何保护可写工作区内的敏感路径"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[Linux 后端](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/linux-sandbox/README.md#L53)", "[文件服务 helper](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/exec-server/src/fs_sandbox.rs#L83)"]
---

**Codex 可先开放工作区写入，再单独保护其中会影响执行行为的敏感路径。**

## 为什么只检查工作区范围不够

`.git`、`.codex` 等目录即使位于工作区，也可能包含仓库或执行器配置。如果仅允许“工作区内的一切写入”，这些配置就会一起开放。

Linux 后端先建立默认只读的文件视图，再挂载可写根，最后对受保护子路径重新施加限制。拒绝读取的对象需要遮蔽，不能只挂成只读。

## 嵌套路径与工具入口

重叠规则按路径具体程度处理；符号链接、解析后的 Git 元数据位置，以及尚不存在的保护目录都要考虑。请求字符串在工作区内，并不能说明最终访问对象也安全。

限制也不只针对 shell：文件服务通过受限 helper 执行文件操作。这说明[[sandbox-filesystem|文件边界]]需要沿每个工具入口检查；[[codex-sandbox-tests|保护路径测试]]则验证普通写入成功、敏感写入失败及原内容未变。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
