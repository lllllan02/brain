---
title: "Pi：用摘要与保留边界重建上下文"
aliases: ["Pi Compaction", "firstKeptEntryId"]
parent: context-compaction
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-11T17:28:47+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md"
  - "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts"
  - "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts"
reading_suggestions:
  - context-budget
---

**「Pi 将摘要和原始会话分别记录，用保留起点重建下一轮消息。」** 本文只整理自动压缩及会话接续，依据 2026-10-11 的官方文档和 main 分支源码，未固定提交或运行验证；分支切换摘要与扩展钩子不在本文范围内。

## 程序怎样切分？

达到上下文窗口扣除输出预留空间后的阈值时，Pi 触发压缩；也支持手动 `/compact`。它从近期消息向前累计 Token，依据 `keepRecentTokens` 寻找保留起点。通常在用户消息处切分，单轮过长时可在模型消息处切分，不能从孤立工具结果开始。

工具循环中，检查可以发生在本批工具结果追加之后、下一次模型响应之前。程序切分历史，模型负责总结被划入旧段的内容，并不生成任意保留 ID 清单。

## 预算怎样触发压缩？

[源码](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)中的触发判断是：

```text
contextTokens > contextWindow - reserveTokens
```

`reserveTokens` 控制多早触发，`keepRecentTokens` 控制切分时保留多大的近期历史，**「两者不是同一预算」**。核对时默认值分别为 16,384 和 20,000，可配置；这些是 Pi 的实现参数，不是通用推荐值，也不等于保留固定消息条数。

例如窗口配置为 200,000 Token 时，按默认预留量计算，阈值为 183,616，即当前估算超过该窗口的约 **91.8%** 时触发；换模型窗口后阈值也随之变化，**「不能概括成固定百分比」**。`reserveTokens` 为模型响应留空间，不是强制输出量；这条公式没有另设独立安全余量，不应重复扣除。

普通摘要生成的输出上限取 `floor(0.8 × reserveTokens)`，再受模型输出上限约束；默认预留量对应 13,107 Token。这只是生成上限，不是实际摘要长度。超长单轮的前缀还可能单独总结，所以不能把「20,000 + 13,107」当作最终上下文的硬上限。最终需重新计算摘要、保留消息及固定输入的总量；没有固定的压缩后占用率。具体分子、分母见[[context-budget|上下文预算的三个比例]]。

`estimateContextTokens` 优先利用有效响应的 usage（含输入、输出及缓存），再估计其后新增消息；缺少 usage 时估算全部消息。估算器按内容类型处理文本、工具调用和图片等。历史被压缩或编辑后，`estimateProjectedContextTokens` 会检查旧 usage 是否仍适用，必要时重新估算当前实际输入，避免继续使用修改前的总量。

这些都是程序计数与阈值逻辑，不能保证未来工具输出大小；新增结果后仍需检查下一轮预算。

## 摘要与边界怎样保存？

摘要按目标、约束、进度、决定、下一步和关键上下文组织。程序还从工具调用累积读取和修改的文件记录；这部分不完全依赖模型回忆。

压缩结果的关键字段为 `summary`、`firstKeptEntryId` 和 `tokensBefore`。会话管理器追加压缩记录，补上记录自身的 ID 等元数据；原始消息继续留在会话中。

例如保留起点是 e42：下一次模型读取「当前指令 + 摘要 + e42 起的原始消息」。e42 是原始消息条目的 ID，不是摘要记录 ID，也不是工具调用配对 ID。再次压缩时结合旧摘要继续推进边界。

## 哪里可以看到实现？

[压缩模块](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)中的 `prepareCompaction` 准备历史与边界，`compact` 组织摘要生成，返回包含摘要和保留起点的结果；[会话管理器](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)负责持久化记录及构建会话上下文。

超长单轮可能需要分别总结更早历史与该轮被切出的前缀，再合并。文件列表帮助追踪操作，但不等于保存完整文件内容，也不能证明摘要无遗漏。
