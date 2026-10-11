---
title: "压缩与裁剪阈值：不同计数范围的例子"
parent: context-budget
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-11T18:35:33+08:00"
updated_at: "2026-10-11T18:48:02+08:00"
source:
  - "https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/context/chatCompressionService.ts"
  - "https://github.com/Aider-AI/aider/blob/main/aider/history.py"
  - "https://platform.claude.com/docs/en/build-with-claude/context-editing"
  - "https://langchain-ai.github.io/langmem/reference/short_term/"
---

**触发摘要、限制历史大小和清理工具结果可以使用不同的计数范围。** 以下按 2026-10-11 的官方文档与 main 源码核对，未运行验证；每项分别说明触发条件和处理后目标，不横向排列为窗口占用率排名。

## Gemini CLI：50% 是触发线，30% 是历史切分目标

[容量定义](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/tokenLimits.ts)为常见 Gemini 模型采用 1,048,576 Token。[压缩模块](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/context/chatCompressionService.ts)优先采用最近请求的输入计数，缺失时估算历史；达到容量的 50%，即 524,288 时触发，阈值可配置。

处理时先按工具结果预算缩短大结果，再按**处理后历史的序列化字符数**寻找保留末尾约 30% 的切点，并对齐有效消息边界。其余旧段生成摘要，最后重新组装。故不能算成「50% × 30% = 压缩后窗口占用 15%」：单位、分母不同，还漏了摘要和固定输入。**最终占窗口多少须重新计数，没有固定比例。**

工具结果裁剪也不是「窗口达到 50,000 Token 就裁剪」。它在上述压缩流程内，从新到旧累计工具结果，尝试将其控制在 50,000 Token 预算；放不下的结果落盘并用缩略内容替换。这个预算约束局部工具内容，不是最终上下文大小，保存失败等情况还可能保留原文。

## Aider：已完成聊天历史超过局部预算才摘要

[模型配置](https://github.com/Aider-AI/aider/blob/main/aider/models.py)默认把历史预算设为模型最大输入容量的 1/16，并限制在 1,024～8,192 Token；可用 `--max-chat-history-tokens` 覆盖。[调用处](https://github.com/Aider-AI/aider/blob/main/aider/coders/base_coder.py)检查的是 `done_messages`：**已完成聊天历史的 Token 数超过历史预算**，就调用摘要器。

例如模型最大输入容量 200,000，历史预算为 8,192。只能说「已完成历史超过 8,192 时摘要」，不能说「完整上下文用到 4.1% 就摘要」，因为系统提示、文件与当前交互另占空间。

[摘要器](https://github.com/Aider-AI/aider/blob/main/aider/history.py)尝试留下约半个历史预算的尾部，摘要与尾部仍超过预算时递归总结；消息边界和退化路径使它不是严格输出长度保证。处理后完整请求的占用率仍需加上其他输入重新计算。

## Claude API：摘要与工具结果清理是两种策略

[[claude-compaction-summary|服务端摘要压缩]]启用后，默认在**输入 Token 达到 150,000** 时触发，最小可设 50,000。只有已知所用模型窗口，才能换算比例；例如假设窗口 200,000，对应 75%。返回压缩块，未承诺固定压缩后比例。该值不代表 Claude Code 默认配置。

[[anthropic-context-editing-summary|工具结果清理]]则在启用相应策略后，默认于**输入超过 100,000 Token** 时开始；从旧工具结果清起，默认保留最近 3 次工具交互，调用参数默认保留。若改为按工具次数触发，分子就是工具次数，与窗口占用率无关。[参数表](https://platform.claude.com/docs/en/build-with-claude/context-editing#configuration-options-for-tool-result-clearing)还允许配置最小清理量；达不到则不执行。

清理后剩多少取决于被替换结果的大小、保留与排除规则；既不是固定剩 3 条消息，也不是固定降到窗口某个比例。可用 Token counting 与 `applied_edits` 检查实际结果。

## LangMem：应用设置消息预算

[[langmem-summarization-summary|LangMem]]按计数器累计**尚未纳入运行摘要的消息**，系统消息单独处理；达到 `max_tokens_before_summary`，并能让剩余消息落入预留后的预算时，确定摘要边界。它统计的是应用交给它的消息，不自动包含外部工具定义等完整请求内容。

`max_tokens_before_summary` 未填时沿用必填的 `max_tokens`；后者是摘要后消息列表的目标预算。`max_summary_tokens` 默认预留 256 Token，生成上限需另配。教程的 256 / 128 是教学参数，不是生产默认窗口。

因此，这里能说明「消息达到多少 Token 开始处理、希望返回的列表控制在多少 Token」，不能给出统一的模型窗口百分比。框架返回的列表仍需与完整请求其他部分一起计数。
