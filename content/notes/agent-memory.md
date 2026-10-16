---
learning_status: pending
parent: agent
title: "Agent 记忆"
aliases: ["Agent Memory", "Long-term Memory", "长期记忆"]
category: "Agent"
tags: ["Agent", "记忆"]
created_at: "2026-10-09"
updated_at: "2026-10-13T10:44:40+08:00"
reading_suggestions:
  - agent-memory-hierarchy
  - agent-memory-storage
  - agent-memory-writing
  - agent-memory-retrieval
  - agent-memory-consolidation
  - agent-memory-experience
  - agent-memory-maintenance
  - agent-memory-practice
  - agent-memory-evaluation
  - agent-memory-selection
---

**Agent 记忆是运行系统保存、组织和调用过去信息，使其影响后续任务的信息管理机制。** 它让 Agent 延续任务、沿用偏好、接受纠正并复用经验。本文聚焦文件、数据库、摘要和技能等外部记忆，不展开模型参数训练。

每次模型推理只看到本轮输入。聊天历史即使已保存，也要经过读取和组装才会参与判断；全部塞回窗口，又会增加成本并混入过时信息。因此，记忆需要完成「从经历中留下什么、以后怎样找到、什么时候不再采用」这一整套管理。

典型过程是「交互与执行结果 → 提取和整合 → 保存带范围与证据的记录 → 按任务读取 → 加入上下文 → 根据新结果更新」。它可以由程序触发，也可让模型调用工具参与，执行边界仍由程序控制。

## 记住的是当前任务，还是跨任务的知识？

按 [[langgraph-memory|LangGraph 的作用域划分]]，短期记忆保存当前线程的历史与任务状态，长期记忆支持跨线程复用。区别不在是否落盘：短期状态也能持久化，长期记忆也可能只是文件；长期不表示永久有效。

内容还可按用途区分：

| 内容 | 要回答的问题 | 例子 |
| --- | --- | --- |
| 事实与偏好，常称语义记忆（Semantic Memory） | 已知什么、当前采用什么？ | 项目甲的示例语言是 Go |
| 经历，常称情节记忆（Episodic Memory） | 在什么条件下做过什么，结果怎样？ | 某次排障的行动与测试结果 |
| 方法，常称程序性记忆（Procedural Memory） | 满足哪些条件时，怎样完成任务？ | 有前提和验证步骤的操作流程 |

这些是内容用途，不规定数据库类型。「语义记忆」也不等同于使用 embedding 的语义检索。

## 怎样保存，又怎样在有限窗口中使用？

[[history-storage|历史存储]]保留过程，[[agent-context|上下文管理]]选择本轮输入，记忆把二者与长期复用联系起来。[[rag|RAG]]可承担记忆的检索与生成环节，但仅把聊天向量化，仍未解决信息形成、纠正和失效。

[[agent-memory-hierarchy|分层记忆]]让少量必要信息常驻，其余细节外置；[[agent-memory-storage|表示与存储]]决定以档案、独立条目、文件还是时序关系保存。选择哪一层、以什么条件查找，以及如何控制注入量，由[[agent-memory-retrieval|检索与注入]]展开。外部记录容量变大，不代表每轮模型输入也随之扩大。

## 新信息怎样改变已有认识与做法？

假设用户先说「项目甲用 Go」，后来明确改成 Python。[[agent-memory-writing|写入与纠正]]需要识别同一项目和属性，替换当前值；若分别属于两个项目，就应同时保留。

记录越来越多后，[[agent-memory-consolidation|记忆整合]]比较多条证据，形成摘要、关联和有条件的认识。[[agent-memory-experience|经验记忆与技能复用]]进一步处理执行反馈，让过去的结果帮助以后选做法。概括和反思都是可能出错的推导，不能因写入记忆就视为事实。

## 怎样判断记忆可靠，工程从哪里开始？

[[agent-memory-maintenance|失效、删除与信任边界]]让过时信息退出使用，并处理索引、摘要和缓存中的派生副本；旧记忆不能压过当前明确要求，第三方资料也不会因被保存而获得指令权限。

[[agent-memory-evaluation|质量评估]]同时检查「是否记对、能否找回、是否用对、能否纠正」，以及成功率、延迟与总成本。具体组件由[[agent-memory-selection|工程选型]]按职责选择；[[agent-memory-practice|最小实现与源码阅读]]则从一个可运行的跨进程偏好示例连接到真实系统。
