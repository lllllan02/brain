---
parent: codex-sandbox-overview
title: "Codex 如何保护可写工作区内的敏感路径"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**允许写工作区，不代表其中所有子路径都应可写。** 仓库配置和执行器配置可能改变后续命令的行为，需要保留更细的限制。

[Linux 后端](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/linux-sandbox/README.md#L53)先组织只读与可写挂载，再对受保护路径恢复限制。例如可写根中的 `.git`、解析后的 Git 元数据目录和 `.codex`，仍需按策略保护；拒绝读取的路径则需要遮蔽，不能只设为只读。

嵌套规则按路径具体程度处理，符号链接与尚不存在的保护目录也要考虑。只检查「请求路径位于工作区」不足以保证最后访问的对象受限。

限制也不只涉及 shell：[文件服务 helper](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/exec-server/src/fs_sandbox.rs#L83)会为文件操作请求准备受限命令。它说明[[sandbox-filesystem|文件边界]]应沿每个工具入口核对；[[codex-sandbox-tests|保护路径测试]]则检查允许写入与拒绝写入能否同时成立。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
