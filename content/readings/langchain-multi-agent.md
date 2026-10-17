---
title: "LangChain：子 Agent、交接与路由的分工"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作", "工程选型"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-17T23:53:29+08:00"
source: ["https://docs.langchain.com/oss/python/langchain/multi-agent/index", "https://docs.langchain.com/oss/python/langchain/multi-agent/subagents", "https://docs.langchain.com/oss/python/langchain/multi-agent/router", "https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs"]
learning_status: pending
---

LangChain 用控制权和上下文组织区分协作模式：主 Agent 委派并汇总，路由先分类，交接让后续处理者接续对话。以下节选官方总览、Subagents、Router 与 Handoffs，核对于 2026-10-17，未运行 SDK 示例。

## 为什么分成这些模式？

[总览](https://docs.langchain.com/oss/python/langchain/multi-agent/index)提出三类需求：控制每个执行者接收的信息、让不同团队独立维护能力、并行推进任务。只有提示或知识不同，可以由同一个 Agent 按需加载 Skills；步骤固定时，可由工作流组合确定性逻辑与 Agent 节点。

## 怎样选择？

[Router 的模式比较](https://docs.langchain.com/oss/python/langchain/multi-agent/router#stateless)区分持续统筹与预先分类：主从模式由保留会话上下文的主 Agent 根据进展动态调用子 Agent，适合下一步随中间结果变化的多步任务；路由适合输入类别与专业领域边界明确的请求，由专门步骤分类后分发。路由可以选一个执行者，也可并行选择多个后汇总，不限于单选。需要多轮会话时可为路由维护状态，或将其包装为会话 Agent 的工具。

[Handoffs 的适用条件](https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs#when-to-use)包括跨阶段直接与用户交互，以及满足前置条件后解锁后续能力。接手角色或状态持续处理后续消息，适合需要接续对话的阶段转换。

## 具体怎样实现？

[Subagents](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents)将子 Agent 包装成工具：接收任务，调用子运行，再提取成果返回主 Agent。专家可以各自暴露工具，也可共用按名称分发的入口。传入查询、选定历史或完整上下文，以及返回成果还是更多历史，决定隔离程度。有依赖就等待；后台执行则需另行管理运行和结果回收。

[Handoffs](https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs)通过工具更新 `active_agent` 或 `current_step`，程序据此切换节点或调整同一个 Agent 的提示与工具。因此，交接不一定创建新 Agent。转交历史时，工具调用与对应结果应成对保留，避免消息历史不合法。

这组文档解释框架内的控制流；业务授权、跨服务协议和最终验收仍由应用定义。
