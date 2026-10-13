---
title: "Claude：服务端摘要压缩怎样接回会话"
aliases: ["Claude Compaction", "Compaction overview", "Compaction on demand"]
parent: context-compaction
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-11T16:33:09+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: "https://platform.claude.com/docs/en/build-with-claude/compaction"
---

**「Claude 的服务端压缩将较早会话替换为摘要；应用仍需正确回传压缩结果，并决定哪些近期消息继续保留。」** 本文以官方总览为入口，整理按需、阈值、近期保留和后台压缩的核心机制，依据 2026-10-11 页面；相关接口处于 beta，未调用 API 验证。

## 谁决定什么时候压缩？

| 方式 | 触发与执行 | 应用承担什么 |
| --- | --- | --- |
| 按需压缩 | 应用单独请求，服务端生成摘要 | 决定时机，将返回块替换进历史 |
| 阈值压缩 | 普通请求达到输入 Token 阈值时，由 API 执行 | 配置触发规则，持续回传压缩块 |
| 自行摘要 | 应用调用模型并组织摘要 | 管理提示词、历史重写及失败处理 |

总览建议在支持的场景采用按需压缩，因为它便于保留近期原文和后台执行；阈值方式适合由 API 在普通请求内自动管理。二者都是摘要机制，与[[anthropic-context-editing-summary|旧工具结果清理]]的规则删除不同。

[阈值接口的参数表](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold)给出：启用 `compact_20260112` 后，`trigger` 默认在输入达到 **150,000 Token** 时触发，可配置的最小值为 **50,000**。这是 API 策略的默认值，不代表 Claude Code 的默认配置。该接口没有承诺压缩后固定剩多少 Token；应用还需统计返回块与后续保留内容的实际大小。

## 按需压缩返回什么，怎样继续？

[按需接口](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)接收待压缩会话，返回带可读摘要和签名的 `compaction` 块，本次不再生成普通回复。应用完整保留该块，将它放在 `messages` 开头，移除被覆盖的消息，再接后续交互；不能只提取摘要文本随意改写后回传。

请求仍必须放得进模型窗口，且最后的工具调用需要已有对应结果。HTTP 成功也可能没有摘要，应检查 `stop_reason` 和内容；失败时保留原历史，按原因调整输出预算或输入后再试。

## 怎样保住近期细节和新到的消息？

[保留近期交互](https://platform.claude.com/docs/en/build-with-claude/compaction-keep-recent-turns)把历史分成旧段与近期段，只摘要旧段，再组成**「压缩块 + 近期原文」**。这样不必依赖摘要重建刚发生的具体交互。切分需保持有效消息结构；简单聊天示例中的消息条数不能直接照搬到工具循环。

[后台压缩](https://platform.claude.com/docs/en/build-with-claude/compaction-background)允许摘要生成期间继续工作，完成后再替换已覆盖的历史，并保留后续新增消息。因此「服务端生成摘要」并不意味着客户端可以覆盖整个当前会话。需要回传 thinking 块时，还须遵守原文单列的保留条件。

[阈值压缩](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold)则在当前请求内执行，默认继续回答；设置 `pause_after_compaction` 可先取得摘要，再补入需要保留的内容。后续必须回传压缩块，API 才会使用压缩后的上下文。

## 应用具体怎样接回消息？

官方近期保留示例的核心是应用先切分，再替换旧段。下面按原例简化，省略客户端、模型、beta 参数及预算配置，不是完整可运行代码：

```python
older, recent = history[:split], history[split:]
response = compact(older)  # 代表官方按需压缩请求，不是 SDK 方法名
if response.stop_reason == "compaction":
    history = [{"role": "assistant", "content": response.content}, *recent]
```

后续用户消息、模型回复和工具结果继续追加到新的 `history`，下一次普通请求带入它。`response.content` 保留接口返回的完整块；模型没有返回 `recent` 的 ID 清单，近期消息是在请求压缩前由应用留下的。原例按简单用户/助手轮次计算切点，工具循环须另外保证调用与结果完整。

## 还需要应用检查什么？

按需摘要的 `compaction.instructions` 会**「完整替换默认摘要提示」**。官方示例明确要求保留已确定的实体、字段名和用户最新未解决请求，并要求只输出摘要、不调用工具。因此，自定义提示应写全必要的保留要求。压缩块不能替代原始附件：后续仍需使用的图片或文档应重新提供。被摘要的会话内系统指令若仍需生效，也须按接口规则重新声明，不能依赖摘要维持其指令地位。

按需压缩的用量记录在 `usage.iterations`，**「不能只看顶层输入输出计数」**。它与 `context_management` 不能在同一请求中使用；兼容模型、beta 请求头及 thinking 保留要求需以对应接口页为准。本文覆盖会话接续机制，不逐项复述所有平台兼容和参数限制。
