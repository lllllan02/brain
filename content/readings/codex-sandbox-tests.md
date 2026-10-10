---
parent: codex-sandbox-overview
title: "Codex 如何测试文件边界与超时清理"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[保护路径测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/linux-sandbox/tests/suite/sandbox.rs#L904)", "[Unix 超时清理测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/exec_tests.rs#L1383)"]
---

**Codex 的这些测试用“允许行为成功、禁止行为失败、最终状态正确”共同验证边界，而不只检查错误码。**

## 文件保护怎样设置对照

测试在可写目录内同时放置普通文件和受保护配置：普通文件应能写入，敏感配置应被拒绝，随后还检查配置原内容没有改变。相邻用例继续检查符号链接替换场景。

如果只验证写入失败，可能只是整个目录都不可写；允许行为作为对照，才能检查边界是否按预期划分。

## 超时是否真的清理了后代

Unix 用例启动带后台子进程的 shell，让执行超时，再检查记录的后代 PID 是否消失。这样验证的是进程清理效果，而非仅仅“工具报告超时”。

用例有平台与依赖前提，bubblewrap 不可用时部分测试会跳过。阅读测试只能说明验证设计；是否实际通过需要运行记录，其他网络、配额和入口仍需单独做[[sandbox-verification|边界验证]]。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
