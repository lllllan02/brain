---
learning_status: organized
title: "Agent"
category: "Agent"
tags: ["Agent", "工程选型"]
created_at: "2026-10-09"
updated_at: "2026-10-18T00:11:35+08:00"
reading_suggestions:
  - agent-loop
  - tool-calling
  - agent-harness
  - agent-context-input
  - agent-context
  - agent-loading
  - agent-planning
  - agent-intent
  - agent-memory
  - agent-feedback-mechanisms
  - agent-checkpoint-recovery
  - agent-guardrails
  - agent-sandbox
  - agent-human-in-the-loop
  - multi-agent
  - agent-trace
  - agent-evaluation
  - agent-vs-workflow
  - enterprise-agent-build
learning_status_changed_at: "2026-10-18T00:15:58.155+08:00"
---

**LLM Agent（智能体）是以大模型为决策核心，在给定目标与约束下选择动作，并根据执行结果调整行动的系统。**

例如修改程序时，模型可以先读代码，再根据测试结果决定下一步，而不必预先写全每条执行路径。

## 最小循环

模型本身只生成输出。通过[[tool-calling|工具调用（Tool Calling）]]，它可以提出工具名称与参数，由程序读取文件、查询服务或执行命令，再把实际结果交回模型。

把这个过程重复起来，就得到[[agent-loop|Agent Loop（运行循环）]]：程序提供用户要求和工具说明，模型选择动作，程序执行并回传结果，模型据此继续行动或给出最终回答。程序还需设置停止条件，避免循环无限运行。

**[[agent-harness|Agent Harness（运行系统）]]是组织这些模型输入、工具执行与循环控制的程序和配置。**

一个简单循环已经具备最基本的 Harness；后续能力围绕任务中出现的困难逐步补充。

![[assets/agent-overview.png|900]]

## 任务变长后，怎样保持目标与进度？

循环继续运行，模型就需要知道此前做过什么、哪些结果仍有效。它在本轮实际收到的指令、记录与资料，合起来称为[[agent-context-input|上下文（Context）]]。

历史和工具结果会不断增长，有限窗口装不下全部内容，因此需要[[agent-context|上下文管理]]保留关键要求、进度与证据，并通过[[agent-loading|按需加载]]取回当前需要的资料、工具定义或 Skill 操作指令。

信息足够，也不代表模型会始终顾及全部目标。[[agent-planning|任务规划（Planning）]]把多阶段工作拆成步骤，跟踪还剩什么；要求含糊或用户中途改口时，还要通过[[agent-intent|意图识别]]重新确认目标、对象与条件，再调整安排。

当类似任务再次出现，已经确认的事实、偏好和经验可以通过[[agent-memory|记忆（Memory）]]保存和复用，减少重复交代与探索。

## 出错或中断后，怎样继续？

循环能继续行动，却不保证每一步都正确。[[agent-feedback-mechanisms|反馈与调整机制]]根据实际结果决定怎样处理：暂时故障可在确认安全后有限[[agent-retry|重试（Retry）]]；结果不符要求时，可通过[[agent-reflection|反思（Reflection）]]分析偏差，再由[[agent-self-correction|自我纠正（Self-Correction）]]落实修改并验证效果。改法明确时可以直接纠正，持续无进展或预算耗尽时停止。

如果整个运行已经中断，仅靠当前进程里的消息就无法接续。[[agent-checkpoint-recovery|检查点与中断恢复]]把必要状态与执行位置持久保存，恢复后继续未完成部分；外部操作可能已生效，重做之前仍须核对。

## 怎样控制真实操作？

Agent 能执行命令、修改文件之后，错误就可能影响真实环境。[[agent-guardrails|行为约束（Guardrails）]]规定并检查输入、数据与操作边界，[[agent-sandbox|沙箱（Sandbox）]]进一步限制执行环境的访问与资源。缺少必要信息、需要批准或审核时，通过[[agent-human-in-the-loop|人工介入（HITL）]]取得人的回复，再决定继续、修改或终止任务。

## 何时需要多个 Agent？

单个 Agent 的上下文或串行探索成为瓶颈，而任务又能形成独立交付物时，可以引入[[multi-agent|多 Agent 协作]]，让不同执行者各自判断、使用工具，再返回成果或交接任务。它增加了通信与协调成本，是否拆分取决于独立运行的实际收益。

## 怎样判断这些能力是否值得？

每补一种能力，都要核对它解决了什么问题。[[agent-trace|执行追踪（Trace）]]记录模型输入、工具与业务步骤，帮助定位偏差；[[agent-evaluation|Agent 评测]]则依据实际产物和过程约束，比较任务质量、可靠性、耗时与费用。模型宣布完成、循环正常退出，都不能代替验收。

按 [[anthropic-effective-agents-summary|Anthropic 的选型原则]]，步骤与分支明确时可采用[[agent-vs-workflow|工作流（Workflow）]]，需要动态判断的部分再交给 Agent。[[enterprise-agent-build|企业是否自建 Agent]]也应从现成系统的具体缺口出发，验证定制收益是否足以覆盖维护投入。
