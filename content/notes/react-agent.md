---
learning_status: understood
parent: agent-planning
title: "ReAct（推理与行动交替）"
aliases: ["ReAct", "Reasoning and Acting"]
category: "Agent"
tags: ["Agent", "ReAct", "执行模式"]
created_at: "2026-10-09"
updated_at: "2026-10-12T00:40:27+08:00"
---

**ReAct（Reasoning and Acting）是让模型交替进行推理与行动、利用行动结果调整后续判断的模式。**

任务需要外部信息时，仅靠模型已有知识可能判断错误；执行动作后，如果不结合结果重新判断，也可能沿着错误方向继续。ReAct 将推理、行动和反馈连起来，让下一步有新的依据。

## 推理与行动怎样配合？

核心流程是：**推理（Thought）→ 行动（Action）→ 观察结果（Observation）→ 再次推理**。模型结合目标和已有结果选择动作，程序执行工具，把外部结果作为观察交回；模型再判断继续查询、改变行动或结束。不必先列出完整计划，也可以在过程中形成或修改计划。

例如，排查性能问题时，模型先选择读取指标；发现应用 CPU 异常后，再选择查看对应调用栈。下一步由新证据决定，这是这一模式的典型用法。

![[assets/react-agent-cycle.png|ReAct：模型选择动作，程序执行工具，观察结果进入下一轮决策]]

这一模式由论文 [[react-paper-summary|《ReAct: Synergizing Reasoning and Acting in Language Models》]]提出，其中的推理用于目标拆解、进度跟踪与异常处理，并不要求每次行动前都写同样长的推理段。论文中的 Thought 是提示与生成轨迹的组织方式，不等于所有模型都会向调用方公开完整内部推理。

## 适用边界

[[agent-loop|Agent Loop]] 描述执行与反馈循环，ReAct 进一步强调循环中推理与行动的结合，不能把所有工具调用循环都直接称为 ReAct。它也可作为 [[plan-and-execute|Plan-and-Execute]] 的子任务执行方式，两种模式并不互斥。

这种方式能及时利用新信息，但反复调用模型会增加耗时和上下文；外部结果无关、模型判断错误时，仍可能重复行动。因此要保留明确目标、有效反馈与停止条件，不能将「有观察结果」等同于「能正确调整」。
