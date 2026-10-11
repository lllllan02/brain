---
parent: context-compaction
title: "压缩摘要的存储与读取"
aliases: ["摘要覆盖范围", "压缩边界", "Summary Boundary"]
category: "Agent"
tags: ["上下文管理", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-11T19:34:04+08:00"
source:
  - "https://langchain-ai.github.io/langmem/reference/short_term/"
  - "https://langchain-ai.github.io/langmem/guides/summarization/"
  - "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md"
  - "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md"
  - "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts"
---

**压缩摘要的存储与读取，需要同时管理摘要内容、它对应的历史范围，以及继续使用的原始消息。** 只保存摘要文字，程序无法判断哪些旧消息已被替代、哪些仍须带入，容易重复加载或遗漏历史。

下面依据 2026-10-11 核对的 LangMem 文档与 Pi 的 main 分支说明；未运行验证。两者展示了具体实现，不代表所有 Agent 使用同一存储格式。

## 实际保存什么？

[[langmem-summarization-summary|LangMem]]用 `RunningSummary` 保存三项信息：

| 字段 | 含义 |
| --- | --- |
| `summary` | 当前摘要文本 |
| `summarized_message_ids` | 已纳入摘要的消息 ID 集合 |
| `last_summarized_message_id` | 最后一条已摘要消息的 ID |

[官方 API](https://langchain-ai.github.io/langmem/reference/short_term/)将这份摘要状态与可供模型调用的 `messages` 分开返回。后续调用传入历史及已有摘要状态，框架据此识别已处理范围。

[[pi-compaction-summary|Pi]]则向会话追加 `CompactionEntry`，核心字段是摘要 `summary` 和保留起点 `firstKeptEntryId`，另有记录自身的 ID、父条目 ID、时间及压缩前 Token 数等。[压缩文档](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md)明确：追加压缩记录后，原始消息仍留在会话中。

两者分别标记「总结到哪里」和「从哪里保留」。这些 ID 用于定位消息，不是让摘要模型生成的文字，也不是工具调用的配对 ID。

## 保存的历史怎样变成模型输入？

以 Pi 的普通连续前缀压缩为例，假设当前分支中消息依次为 m1～m9，压缩记录 c1 的保留起点是 m7：

```text
会话记录：m1 … m6 → m7 → m8 → m9 → c1 → m10
模型历史：c1 中的摘要 + m7 + m8 + m9 + m10
```

这是顺序示意，ID 本身不要求数字递增。[会话重建源码](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)沿当前分支寻找最近的压缩记录，再组合保留段和此后新增消息；不能直接取文件里最后几条记录，也不能把其他分支混进来。当前指令与工具定义仍按请求协议提供。

保留的工具调用及返回内容从原始消息读取，调用 ID 继续用于配对；摘要只替代被覆盖的部分。原文仍在存储中，也不代表模型会自动看到它：回查还需要相应的读取能力。

## 怎样在下一次调用或重启后使用？

[LangMem 教程](https://langchain-ai.github.io/langmem/guides/summarization/)把完整历史与摘要输入分开管理，通过 checkpointer 延续线程状态。教程的 `InMemorySaver` 只保存在内存中；需要跨进程恢复时，须另选持久化存储。把摘要结果写回唯一的历史列表，会改变原文的保留情况。

[Pi 的会话机制](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md)默认保存会话，恢复后按分支与压缩记录重建输入；使用 `--no-session` 的临时会话则不能在退出后恢复。

因此，应用落地时需要确认：原始历史是否保留，摘要和边界是否一起保存，读取时是否选中了正确会话与分支。摘要边界只说明历史覆盖范围；执行到哪一步、工具是否完成等中断恢复问题，仍由[[agent-checkpoint-recovery|Checkpoint 与运行状态]]处理。
