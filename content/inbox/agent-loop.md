---
parent: agent-capabilities
title: "最小 Agent Loop"
aliases: ["Agent Loop", "Agent 循环"]
category: "Agent"
tags: ["Agent", "反馈循环", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-10T21:10:22+08:00"
---

**最小 Agent Loop 是让模型决策、程序执行工具、结果回传模型的反馈循环。** 实现只需模型调用、工具执行、上下文保存和循环控制，可以放在同一段程序中。

1. 调用模型：传入用户问题、当前上下文和可用工具说明。
2. 判断输出：返回最终答案时结束；返回[[tool-calling|工具调用请求（Tool Call）]]时，由程序执行工具。
3. 更新上下文：将工具调用请求与执行结果加入消息历史（Messages），由[[agent-context|上下文管理]]组织下一轮输入，再调用模型。

再次调用模型时，不能只传最初的问题；必须带上之前的调用和结果，模型才能知道执行进展。还需设置最大迭代次数等终止条件，避免无限循环；触发限制不代表任务完成。

循环之外的机制按实际问题选择，见 [[agent-capabilities|Agent 学习与能力扩展]]。
