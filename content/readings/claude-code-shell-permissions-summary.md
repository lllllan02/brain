---
title: "Claude Code：Shell 权限规则与无法判定的调用"
parent: tool-permissions
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10T20:44:35+08:00"
updated_at: "2026-10-10T20:44:35+08:00"
source:
  - "https://code.claude.com/docs/en/permissions"
  - "https://code.claude.com/docs/en/permission-modes"
---

**Claude Code 结合命令解析、权限规则和运行模式决定是否执行；命令匹配无法保证识别脚本的全部行为。** 以下按 2026-10-10 官方文档整理，模式细节可能随版本变化。

## Shell 规则能识别什么？

[Bash 规则](https://code.claude.com/docs/en/permissions#bash)会拆分 `&&`、管道等复合命令，分别检查子命令。允许 `git status`，不能顺带允许 `git status && other-command`；deny、ask 也检查部分嵌套命令。系统会去掉部分已知包装，如 `timeout 30 npm test` 中的 `timeout`。

但规则主要匹配命令文本。例如 `Bash(curl *)` 不能覆盖 `/usr/bin/curl` 等所有等价形式；允许某个解释器或脚本入口，也不能据此推断其内部操作安全。文件与网络的实际访问限制需要沙箱承担。

## 无法直接决定时怎么办？

[权限模式](https://code.claude.com/docs/en/permission-modes#how-auto-mode-evaluates-actions)决定后续路径，不能一概理解成「复杂命令都问人」：

- 手动模式：需要确认的调用交给用户审批。
- `auto`：明确规则先处理，其余部分操作交给分类器，结合调用与会话上下文审查；存在受保护路径等例外。分类器无有效结论时拒绝，特定情形再转人工确认。
- `dontAsk`：原本需要询问的调用直接拒绝，适合不能等待交互的环境。

可借鉴的是「解析与规则 → 模式决定后续处理」的分工。分类器审查与人工批准都不等于证明任意脚本安全；规则、审批和沙箱各自承担一部分约束。SDK 的检查接入点另见[[claude-permissions-summary|Claude Agent SDK 权限摘要]]。
