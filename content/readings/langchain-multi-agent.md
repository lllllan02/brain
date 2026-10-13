---
title: "LangChain：子 Agent、交接与路由的分工"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作", "工程选型"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-13T17:41:05+08:00"
source: ["https://docs.langchain.com/oss/python/langchain/multi-agent/index", "https://docs.langchain.com/oss/python/langchain/multi-agent/subagents", "https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs"]
read: false
---

**「多 Agent 设计首先要决定谁掌握控制权，以及每个执行者能看到哪些信息。」** 本文节选官方多 Agent 总览、Subagents 与 Handoffs 文档的机制和取舍，按 2026-10-13 滚动文档核对，未运行 SDK 示例。

## 为什么需要不同模式？

[总览](https://docs.langchain.com/oss/python/langchain/multi-agent/index)将需求分为上下文管理、不同团队独立维护能力和并行执行。单 Agent 配合动态工具与提示也可能满足要求；复杂任务本身不足以证明需要多个 Agent。

Subagents 由主 Agent 调用并收回结果；Router 先分类，再分发给一个或多个处理者；Custom workflow 由程序安排确定性步骤和 Agent 节点。Skills 按需加载专业指令，控制权仍在同一个 Agent。它们可以组合，不能仅按产品名称判断架构。

## 子 Agent 怎样成为可调用能力？

[Subagents](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents)的基础例子先创建带工具的 Agent，再用一个函数工具包住它的运行：接收查询 → 调用子 Agent → 提取最终消息 → 返回主 Agent。

文档给出两种暴露方法：每个专家各有工具，容易定制输入输出；或统一分发工具接收专家名称，配合静态清单、枚举或动态发现。能力描述影响主 Agent 的选择，实际执行仍由程序完成。

输入可以只传任务，也可以从主状态选取历史和先前结果；输出可以只取成果，也可以保留更多执行信息。**「隔离程度取决于传入和返回什么」**，不能从「子 Agent」这个名称推断共享历史。

同步方式等待结果，适合下一步依赖它的场景；后台方式允许主 Agent 继续工作，但需要管理任务与回收结果。这里的后台执行不等同于代码写了 `async/await`。

## Handoff 改变了什么？

[Handoffs](https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs)通过工具更新 `active_agent` 或 `current_step` 等持久状态，程序据此选择下一处理者或调整提示与工具。专家可以持续处理用户消息，适合分阶段客服。

文档同时允许多个 Agent 节点与单 Agent 动态配置两种实现。因此，发生交接不必然意味着启动新进程或创建新 Agent。跨节点时必须明确传递哪些消息；保留工具调用时还要保留匹配的工具结果，否则历史可能不合法。

这组文档提供框架内的控制流与上下文组织方法，没有替应用定义跨服务协议、业务授权或最终验收标准。
