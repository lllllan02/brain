---
title: "LangMem：用运行摘要延续长会话"
aliases: ["How to Manage Long Context with Summarization", "RunningSummary", "SummarizationNode"]
parent: context-compaction
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-11T16:33:09+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://langchain-ai.github.io/langmem/guides/summarization/"
  - "https://langchain-ai.github.io/langmem/reference/short_term/"
---

**「LangMem 在模型调用前检查消息长度，用持续更新的摘要替代较早历史，并将完整消息与模型实际输入分开保存。」** 本文整理官方教程及短期记忆 API，依据 2026-10-11 页面，未运行示例。

## 摘要怎样接入循环？

教程先在聊天节点中调用 `summarize_messages`：传入消息和已有摘要，取得本轮模型输入，再保存返回的新摘要。也可以把这一步独立为 `SummarizationNode`。在工具型 Agent 中，链路为「摘要检查 → 模型 → 工具 → 摘要检查」，每次工具返回后都重新检查，未达到阈值时不必生成摘要。

教程用独立状态保存完整历史和摘要结果，界面仍可展示原始对话；**「模型只读取 `summarized_messages`」**。Checkpointer 负责延续线程状态，示例的 `InMemorySaver` 属于内存保存，不等于跨进程持久化方案。

## 模型返回什么，框架返回什么？

摘要模型只返回文本。`summarize_messages` 再返回 `SummarizationResult`：`messages` 是可继续传给模型的消息列表，`running_summary` 保存摘要及覆盖记录。这些记录中的消息 ID 由程序计算，不是模型选出的保留名单。

官方接口的调用关系可缩写如下，省略模型初始化、预算参数和错误处理；这是调用说明，不是完整可运行示例：

```python
result = summarize_messages(history, running_summary=saved_summary, ...)
saved_summary = result.running_summary
reply = model.invoke(result.messages)
history.append(reply)
```

其[源码](https://github.com/langchain-ai/langmem/blob/main/src/langmem/short_term/summarization.py)按预处理边界准备摘要输入，再通过最终提示模板接入摘要与剩余消息。历史可以继续独立保存，不能把 `result.messages` 误认为模型重新生成的全套对话。

## 为什么要保存消息边界？

`RunningSummary` 同时记录摘要文本、已摘要消息 ID 集合和最后一个已摘要消息 ID。后续调用据此识别新增历史：不生成新摘要时继续带入旧摘要；需要更新时，将旧摘要与新增待压缩消息一起处理。它解决的是[[context-compaction-storage|摘要覆盖范围]]问题，避免每轮重复摘要同一段原文。

摘要从较早消息开始处理，系统消息不进入摘要；如果边界落在带工具调用的消息上，对应工具结果也一起纳入，**「避免把调用与结果拆开」**。

## 默认提示会怎样提炼？

[摘要源码](https://github.com/langchain-ai/langmem/blob/main/src/langmem/short_term/summarization.py)中的首次提示仅要求总结会话，增量提示要求结合新消息扩展旧摘要；它们**「没有预设目标、约束、文件状态等栏目」**。因此，框架提供摘要调用与边界管理，具体保留规则需要通过 `initial_summary_prompt` 和 `existing_summary_prompt` 定制。此处核对的是 2026-10-11 的 main 分支，未固定提交。

## 三个预算分别限制什么？

| 参数 | 含义 |
| --- | --- |
| `max_tokens_before_summary` | 触发摘要的累计消息阈值 |
| `max_tokens` | 摘要后消息列表预算，也用于限制摘要模型的输入 |
| `max_summary_tokens` | 为摘要预留的 Token 预算 |

[API 参数](https://langchain-ai.github.io/langmem/reference/short_term/)中，`max_tokens` 必填；`max_tokens_before_summary` 未指定时沿用它；`max_summary_tokens` 默认 256。教程中 256 Token 消息预算、128 Token 摘要预留是演示配置，不是生产环境推荐值，也不是模型窗口上限。

**「预留摘要预算」不会自动限制生成长度**，还需给摘要模型设置相应输出上限。默认 Token 计数是近似值，可替换计数器。

API 还注明：待摘要内容超出 `max_tokens` 时，只取其中靠后的预算范围。因而提高触发阈值并不保证更早内容都能被总结，配置时应同时检查摘要输入容量。首次摘要、更新摘要和最终输入组合分别有可配置提示模板。

阅读定位：教程的聊天、独立节点和 ReAct 三个示例；API 的 `RunningSummary` 与 `summarize_messages` 参数说明。文档展示了接入方式，没有给出摘要保真度的实验结论。
