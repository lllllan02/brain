---
title: "LangGraph 与 LangMem：状态持久化和记忆形成"
parent: agent-memory
category: "Agent"
tags: ["Agent", "记忆", "持久化"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-17T22:29:25+08:00"
learning_status: pending
learning_status_changed_at: "2026-10-17T22:03:42.246+08:00"
source:
  - "https://docs.langchain.com/oss/python/concepts/memory"
  - "https://docs.langchain.com/oss/python/langgraph/persistence"
  - "https://docs.langchain.com/oss/python/langgraph/stores"
  - "https://langchain-ai.github.io/langmem/concepts/conceptual_guide/"
  - "https://arxiv.org/html/2309.02427v3#S4.SS1"
  - "https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint/langgraph/store/base/__init__.py"
read: true
---

**「LangGraph 提供记忆的状态与存储基础，LangMem 补充从交互形成和维护记忆的逻辑。」** 本文依据 2026-10-12 官方文档，聚焦两者分工；未运行 SDK 示例。

## 保存线程，与跨线程复用

[Memory overview](https://docs.langchain.com/oss/python/concepts/memory) 将线程内的历史与状态称为短期记忆，将跨线程复用的信息称为长期记忆。这里按复用范围分类，持久化方式是另一个问题。[Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) 将两条路径分开：

- Checkpointer：按 `thread_id` 保存图状态，支持**「同一线程继续运行」**。
- Store：保存图状态之外的应用数据，供**「多个线程访问」**。

把消息写进数据库，只解决了历史保留，不会自动形成跨线程用户档案。

Store 用 namespace 与 key 定位 JSON 对象。应用可以将 namespace 设为组织、用户、项目的组合，并在节点中显式读写。按 key 获取适合已知属性；配置嵌入后可做语义查询，配合字段过滤。具体后端决定持久化与检索能力，示例中的 `InMemorySaver`、`InMemoryStore` 在进程结束后不保留数据。[Stores](https://docs.langchain.com/oss/python/langgraph/stores) 展开了这些接口。

## 记忆能否自动过期

2026-10-17 静态核对 [Store 的 TTL 配置与写入接口](https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint/langgraph/store/base/__init__.py)：条目可设置 TTL，但支持情况取决于存储后端，不能推断所有 Store 都自动过期。

配置区分读取后是否刷新计时（`refresh_on_read`）、是否在读取时排除过期项（`omit_expired`）和定期清理间隔（`sweep_interval_minutes`）。过期后的删除是尽力执行，配置可用性仍取决于后端。因此，读取续期、业务事实的到期日、过滤过期记录和物理删除要分别理解；仅设置 TTL 不能证明到点已清理所有副本。此处只核对接口说明，未实测后端行为；`main` 链接未固定提交。

## 内容怎样组织？

Memory overview 与 LangMem 区分语义记忆（事实与知识，包括偏好）、情景记忆（过去的事件与行动）和程序性记忆（控制行为的方法与规则）。这是内容类型的划分。Memory overview 还比较两种事实组织方式：

| 表示方式 | 收益 | 难点 |
| --- | --- | --- |
| 持续更新的 profile | 同一对象的属性集中，读取容易获得完整背景 | 档案变大后，模型重写可能漏字段，需要结构校验或局部更新 |
| 多条独立文档 | 新信息容易追加，便于定向检索 | 去重、纠正与关联关系更难维护，可能过度插入或过度更新 |

这里的**「语义记忆」指事实内容**，**「语义检索」指寻找内容的方法**；两者不等同。分类也不规定数据库类型。

## 补充：工作记忆与本轮输入

为对照术语，本节仅摘取 [CoALA 论文 v3 第 4.1 节](https://arxiv.org/html/2309.02427v3#S4.SS1)，与上述分类于 2026-10-17 核对；不总结整篇论文，也不把它当作 LangGraph 的接口约定。

CoALA 使用「短期工作记忆」保存当前决策可直接使用的信息，包括观察、目标、推理结果与从长期记忆取回的知识。它是可跨模型调用保留的数据结构；每次调用从中选取相关变量构造输入，输出再经解析更新变量。因此，工作记忆比单次提示词的范围更广，不能简单等同于上下文窗口，也不能把它与短期、长期列成三个互斥层级。

## 谁把交互变成记忆？

[LangMem Core Concepts](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) 将核心转换逻辑与持久化集成分开。Memory Manager 根据新交互和旧记忆**「提出新增、更新、删除或整合」**；核心 API 可独立于数据库使用。Store Manager 再**「把结果写入 LangGraph Store」**，Memory Tools 则允许主 Agent 在对话中主动管理记忆。Prompt Optimizer 面向行为规则的改进，不能与保存用户事实混为一项操作。

主交互中写入能**「立即影响后续动作」**，但增加响应延迟和工具选择负担；后台提取能集中分析多次交互，代价是**「新信息稍后才可见」**。文档给出两种集成路径，没有承诺自动解决业务授权、事实冲突或任务效果问题。

工程含义：已有 LangGraph 的应用可沿用 Checkpointer 与 Store，再决定是否接入 LangMem。 无论采用哪一层，仍需定义**「什么值得记住」**及**「何时把检索结果放进模型输入」**。
