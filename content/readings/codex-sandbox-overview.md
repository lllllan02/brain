---
parent: agent-sandbox
title: "Codex 沙箱源码阅读入口"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这组源码解析回答：一次工具请求怎样获得权限、进入系统边界，并在运行和失败时受到管理。** 阅读范围为 Codex `5ef96ab`，各篇提供固定版本源码。

建议先看命令链路与平台转换，再按所关心的边界选择分支，最后看测试。

| 阅读位置 | 要回答的问题 |
| --- | --- |
| [[codex-sandbox-launch\|命令进入沙箱]] | 从工具参数到实际执行器，限制在哪一层生效？ |
| [[codex-sandbox-platforms\|平台策略转换]] | 同一权限策略怎样落到不同系统后端？ |
| [[codex-sandbox-filesystem\|文件保护]] | 工作区可写时，如何继续保护敏感子路径？ |
| [[codex-credential-broker\|凭据代理]] | 子进程不拿到真实密钥，怎样完成认证？ |
| [[codex-sandbox-retry\|拒绝与重试]] | 被拒绝后，何时审批、怎样改变下一次尝试？ |
| [[codex-exec-session\|持续执行会话]] | 长命令怎样跨工具调用保留，数量如何管理？ |
| [[codex-sandbox-tests\|边界测试]] | 如何检查文件保护和超时清理确实发生？ |

需要先理解这些问题为何存在，返回[[agent-sandbox|沙箱专题主线]]；需要自己创建环境，转到[[sandbox-implementations|实现方案与用法]]。
