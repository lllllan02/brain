---
learning_status: organized
parent: agent
title: "Agent 人工介入"
aliases: ["Human-in-the-Loop", "HITL"]
category: "Agent"
tags: ["Agent", "人工介入"]
created_at: "2026-10-09"
updated_at: "2026-10-17T22:51:18+08:00"
reading_suggestions:
  - tool-approvals
  - agent-checkpoint-recovery
learning_status_changed_at: "2026-10-17T22:52:59.955+08:00"
---

**人工介入（Human-in-the-Loop，HITL）是在 Agent 自动执行过程中，把需要补充信息或作出判断的环节交给人处理，再由程序依据回复继续、修改或终止任务的机制。**

模型可能缺少必要信息，也不能替用户确定偏好或决定所有操作。继续自行推断可能做错任务，因此需要人在关键环节补充信息、审核产物或作出决定。[[tool-approvals|工具调用的审批]]是人工介入的一种，用于取得明确的操作批准。

实现上，可以暂停相关工作，等待回复后通过[[agent-checkpoint-recovery|中断恢复]]接续；[[langgraph-human-interrupts|LangGraph]]和[[openai-guardrails-summary|OpenAI SDK]]提供了对应实现。

![[assets/agent-human-in-the-loop.png|人工介入流程：自动执行、暂停等待、人的回复与后续处理]]
