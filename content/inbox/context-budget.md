---
parent: agent-context
title: "上下文预算（Token Budgeting）"
aliases: ["Token Budgeting", "Context Budget", "Token 预算"]
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**上下文预算（Token Budgeting）是根据模型的窗口与输出限制，为本轮输入、输出及其他必要开销分配 Token 容量的机制。** 只限制消息条数不够，因为一条工具结果也可能非常长。

可以先预留输出和安全余量，再安排当前指令、任务状态与用户输入，剩余容量按任务需要分配给历史、摘要和工具信息。工具定义、工具结果及模型要求计入窗口的其他内容也要纳入估算，具体计数口径以模型接口为准。

[[context-layering|分层]]方便分别设定额度，但不是预算的前提；最简单的实现只控制总输入上限。各层也不需要固定百分比，工具密集任务可以多留工具结果空间。

预算回答「能放多少」，[[context-trimming|裁剪与筛选]]决定「保留哪些」。组装后仍超限，就减少低价值内容、[[context-loading|缩小加载范围]]或压缩历史，再重新检查总量。

压缩调用也有自己的输入与摘要输出预算；预算估算与模型的输出上限需要分别核对，不能只在提示词里要求摘要简短。[摘要预算与输出限制的区别](https://langchain-ai.github.io/langmem/reference/short_term/)
