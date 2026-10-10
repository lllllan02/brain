---
parent: codex-sandbox-overview
title: "Codex 如何测试文件边界与超时清理"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这些测试的学习价值在于检查实际结果，并设置允许行为作为对照。** 它们不能证明所有平台和配置都安全。

[保护路径测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/linux-sandbox/tests/suite/sandbox.rs#L904)在可写工作目录内创建受保护配置：普通文件写入应成功，配置写入应被拒绝，最后还检查原内容未改变。相邻用例继续检查符号链接替换场景。

[Unix 超时清理测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/exec_tests.rs#L1383)启动带后台子进程的 shell，让执行超时，再检查记录的后代 PID 是否消失。它验证特定清理路径，比只断言「工具返回超时」更接近真正目的。

这些测试有平台与依赖前提；bubblewrap 不可用时，部分用例会跳过。阅读测试只能知道验证设计，实际通过需要对应运行记录。[[sandbox-verification|边界验证]]还需单独覆盖网络、配额及其他执行入口。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
