---
learning_status: reading
parent: agent-context
title: "上下文压缩"
aliases: ["Context Compaction", "上下文摘要", "上下文压缩怎样执行"]
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:25:50+08:00"
reading_suggestions:
  - context-budget
  - context-compaction-prompt
  - context-compaction-storage
  - context-loading
  - context-compaction-evaluation
learning_status_changed_at: "2026-10-17T20:19:50.960+08:00"
---

**上下文压缩（Context Compaction）是把较早历史提炼成摘要，再与保留的原始消息组合成后续输入的机制。** 历史接近[[context-budget|输入预算]]时，通过摘要延续目标、进度与关键结论，为后续交互腾出空间。

## 执行流程

下面采用「压缩旧历史、保留近期原文」的方式：

![[assets/context-compaction-process.png|旧历史生成摘要，边界后的原始消息保留，再继续 Agent Loop]]

1. 划定范围。程序按近期 Token 预算或轮数选择保留起点，将更早的消息交给摘要模型；切分不能拆散工具调用与对应结果。[[pi-compaction-summary|Pi]]采用近期 Token 预算，保留条数随消息长度变化。
2. 生成摘要。模型按[[context-compaction-prompt|摘要提示词]]提炼目标与约束、关键事实与决定、实际进度、未解决问题和下一步。区分计划、已执行与已验证，精确保留影响行动的路径、数值和证据位置；大段日志可只留结论与原文位置。再次压缩时，结合旧摘要与新增待压缩消息更新。
3. 记录边界。程序把摘要和覆盖到哪条消息一起[[context-compaction-storage|保存]]，原始历史继续保留。边界使用消息 ID，由程序记录，避免下次重复带入或遗漏历史。
4. 组装输入。程序保留仍生效的系统指令与工具定义，用摘要替代已覆盖历史，再接边界之后的原始消息。保留段直接读取原文，调用 ID 与工具结果不让模型重新生成；[[langmem-summarization-summary|LangMem]]由框架完成消息组装。
5. 检查并继续。程序重新计算完整输入大小并检查消息配对；仍超预算时调整摘要长度或保留范围，再检查。摘要生成失败时不推进覆盖边界。输入可用后继续模型与工具循环，新增消息后再次检查预算，无需每轮都生成摘要。

上述流程由应用管理摘要；[[claude-compaction-summary|服务端压缩接口]]可能返回专用压缩块，应用须按接口要求完整保存和回传，不能一律当作普通摘要文本处理。

## 怎样避免压缩后接错任务？

摘要可能漏掉条件或把待办写成已完成。后续遇到信息不足或冲突时，应[[context-loading|回查原始记录]]，核对关键状态；带副作用的操作不能仅为找回结果而重做。多次压缩也可能累积误差，旧摘要不能替代原始证据。

[[context-compaction-evaluation|效果评估]]应检查关键约束和事实是否保留、Agent 能否正确续做，并计入摘要与回查成本；摘要更短、文字通顺都不足以证明压缩有效。
