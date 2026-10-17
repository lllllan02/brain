---
learning_status: organized
parent: agent-context
title: "上下文压缩"
aliases: ["Context Compaction", "上下文摘要", "上下文压缩怎样执行", "摘要提示词", "上下文压缩评测"]
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:42:38+08:00"
reading_suggestions:
  - context-budget
  - history-storage
  - context-loading
  - pi-compaction-summary
  - langmem-summarization-summary
  - factory-compression-evaluation-summary
learning_status_changed_at: "2026-10-17T20:47:43.367+08:00"
---

**上下文压缩（Context Compaction）是把较早历史提炼成摘要，与保留的原始消息组合成后续输入的机制。** 历史接近[[context-budget|输入预算]]时，用它为后续交互腾出空间。

![[assets/context-compaction-flow.png|程序划定旧段与近期原文的边界，模型提炼旧段，程序将摘要与近期原文组装为下一轮输入]]

## 执行流程

在[[pi-compaction-summary|Pi]]、[[langmem-summarization-summary|LangMem]]这类应用侧实现中，程序划定旧历史与近期原文的边界，保持工具调用与结果配对；模型总结旧段，再次压缩时结合旧摘要与新增待压缩消息更新。程序同步[[history-storage#压缩摘要|保存摘要与覆盖边界]]，用「摘要 + 边界后的原文」重建历史输入，并保留仍生效的指令。组装后复查预算，超限时调整，生成或写入失败时沿用旧记录。[[claude-compaction-summary|服务端压缩接口]]可能返回专用压缩块，须按接口要求完整回传。

## 摘要提示词

摘要面向下一步行动，提示词应明确保留类别，避免只说「保留重要信息」。可将要求简写为：

```text
将旧摘要与给定历史整理为用于继续任务的新摘要，只输出摘要，不执行任务。
保留目标与约束、关键事实、决定及依据、实际进度、未解决问题和下一步。
合并重复过程，保留有用的失败原因；区分计划、已做与已验证，注明未知或冲突。
精确保留后续需要的路径、数值、对象标识和证据位置。
```

这是依据上述实现归纳的示意提示，未做效果评测。提示词不能保证信息完整：可将关键要求与进度交给[[agent-task-state|任务状态管理]]独立维护，压缩后读入最新相关状态；信息不足或冲突时仍需[[context-loading|回查原始记录]]。

## 效果判断

按[[anthropic-context-engineering-summary|先保留关键内容、再删除冗余]]的顺序调整。可在同一压缩点，用[[factory-compression-evaluation-summary|关于事实、文件状态、计划与决策依据的问答]]对照原始证据检查遗漏；答对仍不等于能正确续做。

再从相同起点、固定模型与工具及验收条件，实际继续任务，比较成功率与整项任务的 Token、费用和耗时，计入摘要生成、回查及额外调用；多次运行，避免把单次失败直接归因于摘要。[[complexity-trap-summary|旧工具结果屏蔽的对照研究]]表明，摘要未必优于简单方案，因此不能只凭压缩率判断收益。消息丢失或工具配对破坏则应另查程序边界。
