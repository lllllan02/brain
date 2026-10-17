---
title: "Anthropic：多 Agent 研究系统的收益与代价"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作", "上下文管理"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-17T23:05:45+08:00"
source: "https://www.anthropic.com/engineering/multi-agent-research-system"
learning_status: pending
---

Anthropic 的研究系统用主 Agent 分解问题，子 Agent 并行调查，再汇总证据。收益来自各分支独立搜索和压缩资料，代价是额外调用与协调。本文节选 2025-06-13 原文的分工、评测和运行经验，数字仅代表文中系统。

## 为什么有效，又在哪里失效？

主 Agent 保存计划、分配方向；子 Agent 搜索并返回发现，主 Agent 判断是否补查，资料足够后由引用处理环节定位证据。原文以跨多家公司查董事成员为例，说明广度调查适合拆成独立分支。

作者报告 Opus 4 主 Agent 与 Sonnet 4 子 Agent 在内部研究评测中，相对单 Opus 4 提升 90.2%；这是相对指标，不是成功率增加 90.2 个百分点，也没有证明同预算收益。多 Agent 的 Token 用量约为普通聊天的 15 倍，分母并非单 Agent。强依赖、需要共享大量上下文的任务较难获益。

## 工程上怎样约束？

早期系统出现过量建 Agent、重复调查和无止境搜索，作者通过明确目标、输出格式、工具、来源范围和投入预算约束分工。成果可保存为产物并返回引用，减少多次转述的损失；检查点用于恢复，Trace、自动评估与人工检查用于定位问题。

文中同步等待整组结果会受慢分支阻塞；异步方案能增加重叠工作，也需处理状态一致性和错误传播，不能只改成并发调用。
