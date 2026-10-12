---
title: "LongMemEval：跨会话记忆与经验复用评测"
parent: agent-memory-evaluation
category: "Agent"
tags: ["Agent", "记忆", "评测"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-12T23:24:47+08:00"
source:
  - "https://github.com/xiaowu0162/LongMemEval"
  - "https://github.com/xiaowu0162/LongMemEval-V2"
---

**LongMemEval 用带时间的多次交互检查记忆能力，V2 将关注点扩展到 Agent 对具体环境的经验。** 本文依据 2026-10-12 两个官方仓库的任务定义，未运行 benchmark，不引用跨配置产品排名。

## 对话记忆评什么？

[LongMemEval](https://github.com/xiaowu0162/LongMemEval) 的 500 道问题覆盖信息提取、跨会话推理、知识更新、时间推理与信息不足时的拒答。系统先消化历史，再回答问题；只测向量召回不能覆盖整条链路。

数据提供问题日期、会话日期、证据会话 ID，以及部分证据轮次标记。普通设置给出长历史，oracle 设置只保留证据会话。两者对照可以帮助判断是找不到证据，还是拿到证据仍不会回答，但不能单凭差值精确定位每个组件。

## 经验记忆评什么？

[LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2) 提供 451 道人工整理问题，输入是较长的 Agent 交互轨迹，考察静态状态、动态变化、工作流程、环境陷阱和前提条件。评测同时关注答案与查询延迟。

它提示一个工程区别：记住用户喜欢什么，与记住某环境中“哪条操作路径可行、什么假设不成立”是两类任务。后者需要保留行动、结果、适用环境与证据，只有事实短句可能不足。

落到自己的系统时，可借用上述能力分类构造真实任务回归，并固定模型、历史、Token 预算、初始记忆和计时口径。QA benchmark 的分数不能直接等同于工具执行成功率、数据删除效果或生产可靠性，这些需要另设检查。
