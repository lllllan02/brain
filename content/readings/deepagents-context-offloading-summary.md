---
title: "Deep Agents：外置上下文与原文回查"
parent: context-loading
category: "Agent"
tags: ["上下文管理", "按需加载"]
created_at: "2026-10-11T21:07:40+08:00"
updated_at: "2026-10-11T21:07:40+08:00"
source:
  - "https://www.langchain.com/blog/context-management-for-deepagents"
  - "https://docs.langchain.com/oss/python/deepagents/context-engineering"
  - "https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/middleware/filesystem.py"
---

**Deep Agents 将大结果和旧历史移到窗口之外，同时保留预览、摘要和读取入口，让 Agent 能找回被省略的细节。** 本文聚焦 LangChain 上下文管理文章与官方文档中的外置、回读和恢复验证，不展开工具定义与 Skill 加载。

## 哪些内容被外置？

| 对象 | 窗口里留下什么 | 需要细节时怎么办 |
| --- | --- | --- |
| 大工具返回结果 | 预览与文件路径 | 搜索结果文件，按范围读取 |
| 历史中的长写入、编辑参数 | 已保存文件的位置 | 重新查看对应文件 |
| 被摘要替代的旧消息 | 会话目标、产物与下一步摘要，以及历史访问入口 | 搜索保存的会话文本 |

2026-01-28 的工程文章以超过 20,000 Token 的工具结果为例：正文转入文件系统，模型看到路径和前 10 行预览。这是该文的实现参数，不是按需读取的通用阈值。

## 怎样从引用找到内容？

文件系统工具提供列目录、搜索和读取能力。[读取工具实现](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/middleware/filesystem.py)支持通过 `offset`、`limit` 分段读取文本，避免把外置内容一次性全部加载回来。这里的文件系统是后端抽象，不必等同于本机磁盘。

[官方文档的摘要部分](https://docs.langchain.com/oss/python/deepagents/context-engineering#summarization)将上下文中的摘要与外部保存的会话文本分开：摘要维持任务方向，历史记录用于找回具体细节。文本回查不等于恢复全部消息协议字段或原始多模态数据。

## 怎样确认真的能找回？

[工程文章的针对性评测](https://www.langchain.com/blog/context-management-for-deepagents)在早期历史中放入一个事实，强制发生摘要，再要求 Agent 使用该事实完成任务。事实已不在当前上下文中，必须通过文件搜索恢复。另有测试检查摘要后是否仍沿着原目标继续工作。

这类测试验证「外置 → 发现 → 读取 → 使用」是否连通，不能代替完整任务评测。可借鉴的判断是：不仅检查文件有没有写出，还要观察 Agent 能否定位所需片段，并据此继续任务。
