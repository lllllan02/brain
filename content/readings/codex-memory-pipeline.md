---
title: "Codex 源码：后台提取与跨会话整合"
parent: agent-memory-practice
category: "Agent"
tags: ["Agent", "记忆", "源码阅读"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://learn.chatgpt.com/docs/customization/memories"
  - "https://learn.chatgpt.com/docs/agent-configuration/agents-md"
  - "https://github.com/openai/codex/tree/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write"
---

**「Codex 的公开实现把记忆写入拆成“提取单次会话”与“整合多次会话”，后台任务的协调由程序完成，哪些经验值得保留由模型结合证据判断。」** 本文依据 2026-10-12 官方文档及提交 `97239fd052db455bd08c41afcdab738e0fe83b87`，只做静态源码核对，没有运行整套 Codex，也不代表当前客户端已启用该功能。

## 为什么需要独立的后台流程？

[官方 memories 文档](https://learn.chatgpt.com/docs/customization/memories) 说明，符合条件的旧会话在空闲一段时间后才被处理，**「记忆不会在每次聊天结束时立即更新」**。必需的团队规范应放在 `AGENTS.md` 等明确入口，不能只依赖自动回忆。[AGENTS.md 文档](https://learn.chatgpt.com/docs/agent-configuration/agents-md) 另行规定指令文件发现和加载规则。

[`start.rs`](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/src/start.rs) 的 `start_memories_startup_task` 先排除临时会话、功能未开启和非根 Agent，再检查状态存储、准备目录、清理及额度条件，最后依次启动 Phase 1、Phase 2。源码支持版本选择及 dual-write，因此不能把一个版本的文件布局写成所有部署的固定行为。

## 单次会话怎样形成候选？

[`phase1.rs`](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/src/phase1.rs) 领取有限数量的待处理任务，读取 rollout、组织模型输入、要求结构化输出，再把成功、无输出与失败分别记回状态库。任务领取与所有权令牌用于协调并发工作；不能靠提示模型“不要重复”代替它。

两套提取提示有不同输出：

| 路径 | 提取产物及判断 |
| --- | --- |
| [V1 提取提示](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/templates/memories/stage_one_system.md) | rollout summary、slug、raw memory；区分偏好证据、验证结果、失败经验，可返回空结果 |
| [V2 提取提示](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/templates/memories/stage_one_system_v2.md) | summary 与 slug；保存有上下文的任务历史，强调不要把单次要求推广成稳定偏好 |

例如，“这次先给计划”只支持本次任务要求，不能直接保存为“用户每次都要先审批计划”。V2 明确**「保留用户表达的范围」**，以及提议、执行、验证、未完成之间的区别。

## 多次候选怎样变成可用记忆？

[`phase2.rs`](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/src/phase2.rs) 先取得全局任务租约，再同步候选到工作目录，计算相对前次基线的变化。没有变化且产物有效时直接完成；否则启动整合 Agent，运行期间续租，完成后校验产物、确认所有权、重置基线，再记录成功。

V1 的 [consolidation 模板](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/templates/memories/consolidation.md) 区分导航摘要、可搜索的 `MEMORY.md`、会话摘要和可复用流程。V2 的 [consolidation 模板](https://github.com/openai/codex/blob/97239fd052db455bd08c41afcdab738e0fe83b87/codex-rs/memories/write/templates/memories/consolidation_v2.md) 聚焦 `memory_summary.md` 与准确的历史指针，要求完整摘要明显低于 10,000 UTF-8 字节，并删除只由已删除来源支持的结论。这里是模板与程序的实现约束，不是所有产品的通用阈值。

**可借鉴的分工是：程序控制何时处理、处理哪批、写入是否成功；模型判断复用价值、合并范围与描述方式。** 两阶段允许提取并行、共享产物整合串行，也引入后台延迟、失败重试和派生内容同步问题。

仓库该提交的 memories README 仍提及旧的 `core/src/memories/` 路径；本篇链接以实际存在的 `memories/write/src/` 为准。阅读时从启动函数进入两阶段调用，比只看模板更能理解运行机制。
