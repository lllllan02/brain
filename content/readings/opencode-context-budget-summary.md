---
title: "OpenCode V2：上下文预算与压缩阈值"
parent: context-budget
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-11T18:46:39+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts"
  - "https://dev.opencode.ai/v2/docs/compaction/"
---

**「OpenCode V2 从输入容量基准中扣除预留空间，得到触发线；预留带有最低值，因此触发比例并不固定。」**

本文依据 2026-10-11 核对的官方文档及公开源码，未固定源码提交或运行验证。比例计算沿用[[context-budget|上下文预算的计数口径]]。

这里以「模型上下文上限 200,000、没有单独输入上限、未覆盖 buffer」为假设配置，套入当前 V2 源码；不是声称 OpenCode 只支持 200K 窗口。

## 怎样计算预算？

| 项目 | 该配置下的值与口径 |
| --- | --- |
| 计算基准 | 优先使用 `limit.input`；未给出时使用 `limit.context`。本例为 200,000 |
| 当前计数 | 最近有效响应的输入、缓存、输出及 reasoning 用量，加之后新增内容的估算；缺少有效用量时估算请求 |
| 预留空间 | 默认取基准的 10% 与 16,000 中较大者，本例为 20,000；不足 32,000 的小窗口只留 10% |
| 自动压缩 | 当前估算达到 200,000 − 20,000 = 180,000，即本例基准的 **90%** |
| 输出与安全余量 | 该预留为后续回复和摘要腾空间；触发公式不再独立减一次 `limit.output`，没有额外固定安全余量字段 |
| 压缩后 | 默认近期保留目标约 15,000 Token，加摘要与固定输入；**最终窗口占用率不固定** |

依据[压缩源码的 `calculateCeiling` 与 `estimatePrompt`](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts)。若基准只有 100,000，默认仍预留 16,000，触发点就是 **84%**；如果另设 `limit.input`，分母也随之改变。所以不能笼统写成「OpenCode 固定在模型窗口 90% 压缩」。

## 压缩后剩多少？

[V2 文档](https://dev.opencode.ai/v2/docs/compaction/)把 15,000 定义为**「近似近期保留量」**。近期段的长工具结果还会缩短，附件改为描述；它是保留目标，不是压缩后总量。源码中的超限重试比例 70%、50%、35% 用于缩小**送去压缩的请求**，同样不是最终摘要占比。V1 参数不与此处混用。
