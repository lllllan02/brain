---
title: "Claude Agent SDK：权限规则如何决定工具调用"
parent: agent-guardrails
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions)"
---

**权限结果由多层规则共同决定，审批回调只处理尚未被前面步骤决定的调用。** 本文按 2026-10-10 官方文档整理，具体顺序属于该 SDK 的实现。

## 判断顺序

Hooks → deny 规则 → ask 规则 → 权限模式 → allow 规则 → `canUseTool` 回调。

这不是所有调用都会走完的流水线：拒绝规则可以阻止执行，ask 规则转入确认，提前自动批准的调用则可能跳过回调。Hook 返回允许也不会跳过后续 deny、ask 检查。

## 两个容易误解的地方

- `allowedTools` 表达自动批准规则，不等于完整的可用工具白名单；未列出的工具仍可能可用。
- 不能把必须逐次执行的检查只放在 `canUseTool` 中。原文建议这类检查使用更早执行的 `PreToolUse` Hook。

规则还区分整个工具和参数模式。例如禁止整个 Bash 工具与禁止匹配某种命令的调用，覆盖范围不同；简单文本模式不等于识别所有等价命令。

这篇适合参考规则优先级与检查位置，不能把 SDK 权限规则当作操作系统沙箱隔离。
