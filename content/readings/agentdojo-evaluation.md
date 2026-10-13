---
title: "AgentDojo：同时测正常任务与提示注入防御"
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T10:54:39+08:00"
updated_at: "2026-10-13T10:54:39+08:00"
source: ["https://agentdojo.spylab.ai/concepts/task_suite_and_tasks/", "https://agentdojo.spylab.ai/results/", "https://agentdojo.spylab.ai/concepts/attacks/"]
---

AgentDojo 在工具环境中组合正常用户任务与攻击者目标，观察提示注入是否改变 Agent 行为。本文节选 2026-10-13 官方任务、攻击与结果文档，未实施攻击或运行框架。

## 攻击如何进入正常任务？

[任务文档](https://agentdojo.spylab.ai/concepts/task_suite_and_tasks/) 将初始环境、工具与任务绑定。环境中定义可替换的注入位置；没有攻击时使用正常内容，有攻击时在允许位置插入攻击文本。UserTask 定义用户目的，InjectionTask 定义攻击目标，两者独立。

[攻击文档](https://agentdojo.spylab.ai/concepts/attacks/) 说明攻击生成器如何根据允许条件构造内容。攻击者获得的任务信息和控制范围属于威胁模型，变更这些条件会改变测试难度。

## 为什么安全和可用性要一起看？

[结果页](https://agentdojo.spylab.ai/results/) 分别展示正常任务效用、攻击下效用和目标攻击成功率。若防御让 Agent 拒绝一切工具操作，攻击可能失败，用户任务也会失败；只汇总拒绝率无法反映这一代价。

自建测试可以沿用同一任务的干净与攻击版本，保持环境和预算可比，再单独检查不当副作用。报告攻击成功率时要写明分母是哪些任务、哪些攻击尝试，以及是否只纳入正常情况下可完成的任务。这个分母说明是实验报告要求，不能仅从一个 ASR 数字推断。
