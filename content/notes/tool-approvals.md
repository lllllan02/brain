---
learning_status: understood
title: "工具调用的审批"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10T20:33:24+08:00"
updated_at: "2026-10-17T14:47:49+08:00"
reading_suggestions:
  - tool-permissions
  - agent-checkpoint-recovery
  - permit-agent-approvals-summary
  - openai-guardrails-summary
---

**工具调用的审批（Tool Approval）是在工具执行前，把具体调用交给用户决定通过或拒绝的机制。** Agent 当前未获授权时，可以通过审批请求用户批准本次操作或授予所需权限；具体哪些调用需要审批，由[[tool-permissions|权限规则]]决定。

用户需要看到工具要做什么、操作哪个对象、使用哪些参数，以及有什么影响。[[permit-agent-approvals-summary|批准可以针对本次调用，也可以授予明确范围的权限]]，界面应说明本次申请的是哪一种。

## 审批怎样控制工具执行？

审批要求程序在获得批准前保留待处理调用，收到用户决定后再处理：

1. 程序保留待审批调用：模型提出需要审批的调用后，程序将其标为等待审批，暂不执行。
2. 程序展示申请：将工具名称、具体参数、操作影响与申请的授权范围呈现给用户，等待通过或拒绝。
3. 程序处理用户决定：通过后允许该调用继续执行；拒绝则跳过，并把拒绝结果交回 Agent，由其说明情况、调整方案或结束。

**「等待审批」只阻止该调用及依赖它的后续工作。** 具备并发与[[tool-scheduling|执行调度]]能力的 Agent，可以先保留这项调用，继续处理其他无依赖的工作；收到批准后，再将它交回调度。

暂停整个流程、收到决定后再通过[[agent-checkpoint-recovery|中断恢复机制]]接续，也是一种实现方式。[[openai-guardrails-summary|OpenAI Agents SDK 的审批接口]]提供了这类流程：返回待审批调用和运行状态，应用提交决定后恢复运行。

用户未回复时，该调用保持等待；超时或取消也不能当作通过。
