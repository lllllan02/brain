---
title: "LangGraph 与 LangMem：状态持久化和记忆形成"
parent: agent-memory
category: "Agent"
tags: ["Agent", "记忆", "持久化"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-13T12:42:39+08:00"
source:
  - "https://docs.langchain.com/oss/python/concepts/memory"
  - "https://docs.langchain.com/oss/python/langgraph/persistence"
  - "https://docs.langchain.com/oss/python/langgraph/stores"
  - "https://langchain-ai.github.io/langmem/concepts/conceptual_guide/"
read: true
---

**「LangGraph 提供记忆的状态与存储基础，LangMem 补充从交互形成和维护记忆的逻辑。」** 本文依据 2026-10-12 官方文档，聚焦两者分工；未运行 SDK 示例。

## 保存线程，与跨线程复用

[Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) 将两条路径分开：

- Checkpointer：按 `thread_id` 保存图状态，支持**「同一线程继续运行」**。
- Store：保存图状态之外的应用数据，供**「多个线程访问」**。

把消息写进数据库，只解决了历史保留，不会自动形成跨线程用户档案。

Store 用 namespace 与 key 定位 JSON 对象。应用可以将 namespace 设为组织、用户、项目的组合，并在节点中显式读写。按 key 获取适合已知属性；配置嵌入后可做语义查询，配合字段过滤。具体后端决定持久化与检索能力，示例中的 `InMemorySaver`、`InMemoryStore` 在进程结束后不保留数据。[Stores](https://docs.langchain.com/oss/python/langgraph/stores) 展开了这些接口。

## 内容怎样组织？

[Memory overview](https://docs.langchain.com/oss/python/concepts/memory) 区分事实、经历与操作规则，并比较两种事实组织方式：

| 表示方式 | 收益 | 难点 |
| --- | --- | --- |
| 持续更新的 profile | 同一对象的属性集中，读取容易获得完整背景 | 档案变大后，模型重写可能漏字段，需要结构校验或局部更新 |
| 多条独立文档 | 新信息容易追加，便于定向检索 | 去重、纠正与关联关系更难维护，可能过度插入或过度更新 |

这里的**「语义记忆」指事实内容**，**「语义检索」指寻找内容的方法**；两者不等同。分类也不规定数据库类型。

## 谁把交互变成记忆？

[LangMem Core Concepts](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) 将核心转换逻辑与持久化集成分开。Memory Manager 根据新交互和旧记忆**「提出新增、更新、删除或整合」**；核心 API 可独立于数据库使用。Store Manager 再**「把结果写入 LangGraph Store」**，Memory Tools 则允许主 Agent 在对话中主动管理记忆。Prompt Optimizer 面向行为规则的改进，不能与保存用户事实混为一项操作。

主交互中写入能**「立即影响后续动作」**，但增加响应延迟和工具选择负担；后台提取能集中分析多次交互，代价是**「新信息稍后才可见」**。文档给出两种集成路径，没有承诺自动解决业务授权、事实冲突或任务效果问题。

工程含义：已有 LangGraph 的应用可沿用 Checkpointer 与 Store，再决定是否接入 LangMem。 无论采用哪一层，仍需定义**「什么值得记住」**及**「何时把检索结果放进模型输入」**。
