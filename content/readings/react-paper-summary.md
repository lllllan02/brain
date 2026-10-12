---
title: "ReAct 论文：让推理与行动相互提供信息"
parent: react-agent
category: "Agent"
tags: ["Agent", "ReAct", "执行模式"]
created_at: "2026-10-12T00:22:57+08:00"
updated_at: "2026-10-12T00:22:57+08:00"
source: "[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/html/2210.03629v3)"
---

**ReAct 用推理组织行动，再用环境反馈修正判断。** 论文针对两类问题：只靠模型推理容易沿错误事实继续生成；只生成动作又容易丢失目标和进度。

## 信息怎样进入循环？

模型生成推理与动作，环境返回观察。推理可拆解目标、提取观察中的信息、跟踪进度或修改计划；行动则查询知识或改变环境。例如问答任务通过 Wikipedia 检索获得证据，再决定下一次查询。推理本身不会改变外部环境。

原论文用少量示例提示模型生成这种轨迹。交互任务中的推理可以稀疏出现，不要求每个动作前都有固定格式的长解释。[第 2 节](https://arxiv.org/html/2210.03629v3#S2)

## 结果与限制

实验覆盖 HotpotQA、FEVER、ALFWorld 和 WebShop。结合推理与行动相对只行动的基线有收益，但并非所有任务都优于只推理：在 HotpotQA 上仍受无效检索、推理错误和重复行动影响。外部反馈提供了纠错依据，不保证模型能利用好它。[第 3.3 节](https://arxiv.org/html/2210.03629v3#S3.SS3)

这是 ICLR 2023 论文的机制与结果概述，未复现实验；不作为当前模型之间的性能比较。
