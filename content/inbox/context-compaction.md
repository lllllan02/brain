---
parent: agent-context
title: "上下文压缩（Context Compaction）"
aliases: ["Context Compaction", "上下文摘要", "上下文压缩怎样执行"]
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-09"
updated_at: "2026-10-11T19:11:28+08:00"
---

**上下文压缩（Context Compaction）是将历史提炼成较短摘要，与保留的原始消息一起继续任务的机制。** 对话和工具结果持续增长，有限窗口无法始终容纳完整历史；相比直接[[context-trimming|裁剪]]，摘要能保留旧历史的主要信息，但可能遗漏细节。

## 怎样压缩？

下面以连续前缀压缩为例：旧段生成摘要，边界后的消息原样保留。程序管理预算、边界和消息组装，模型负责总结。

![[assets/context-compaction-process.png|旧历史生成摘要，边界后的原始消息保留，再继续 Agent Loop]]

1. 检查[[context-budget|上下文预算]]，判断是否需要压缩。
2. **「由程序按配置策略划定保留边界」**。[[pi-compaction-summary|Pi]]按近期 Token 预算确定范围，消息条数不固定；[[claude-compaction-summary|Claude 的近期保留示例]]由应用指定轮数。边界不能拆开工具调用与结果。
3. 将旧摘要与新增待总结历史交给模型，通过[[context-compaction-prompt|摘要提示词]]要求模型保留目标、约束、关键事实、进度和待办，合并重复内容。
4. 用新摘要替换旧段，接上保留消息；校验结构和预算后，按[[context-compaction-storage|摘要的存储与读取规则]]记录摘要及覆盖边界；失败时保留旧状态。[[langmem-summarization-summary|LangMem]]展示了摘要与保留消息的组装方式。

图中保留 m7～m9 只是示例，不代表固定保留三条或三轮。

## 有什么局限？

**「保留近期历史」不等于「保留所有重要原文」**。较早的工具结果仍可能有用，却已被摘要掉。已知需要时可以前移边界，代价是压缩空间减少；遗漏后可通过[[context-loading|按需加载]]回查存档，没有可用原文时才可能需要重新调用工具。仅保存调用 ID 不等于保存结果，带副作用的操作也不能为找回结果而盲目重做。

选择性保留可以留下分散的重要交互，但需要额外的选择与依赖校验，不能视为上述实现的默认能力。保留范围与摘要详细程度是两个独立维度。

压缩效果应结合信息保留、任务表现与总成本判断，具体见[[context-compaction-evaluation|上下文压缩的效果评估]]。
