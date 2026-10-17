---
learning_status: organized
parent: agent
title: "Agent 行为约束"
aliases: ["Guardrails", "Agent Guardrails"]
category: "Agent"
tags: ["Agent", "行为约束"]
created_at: "2026-10-09"
updated_at: "2026-10-17T23:29:15+08:00"
reading_suggestions:
  - langchain-guardrails-summary
  - tool-permissions
  - tool-approvals
  - agent-evaluation
learning_status_changed_at: "2026-10-17T23:29:47.463+08:00"
---

**Agent 行为约束（Guardrails）是让 Agent 在规定的职责、数据与操作边界内工作的规则和控制机制。** 用户 Query、检索资料或工具结果可能包含[[prompt-injection|提示注入]]，模型也可能在正常任务中犯错，需要同时指导其判断、限制其真实能力。

防护可按两层理解：**「提示词说明应该怎么做，程序限制实际能做什么。」**

![[assets/agent-guardrails.png|Agent 行为约束：提示词软约束指导模型，程序硬约束限制真实执行]]

## 提示词的软约束

在系统提示词中明确指令优先级、允许的任务范围与禁止事项。例如，要求模型把检索内容作为资料，而不是新的操作授权，不能服从其中改变职责或泄露信息的指令。[[owasp-agent-boundaries-summary|区分可信指令与外部内容]]可以减少误导，但模型仍可能误解或被绕过，提示词本身无法保证执行边界。

## 程序的硬约束

在权限和执行入口强制落实边界：只开放任务所需的工具与[[tool-permissions|权限]]，由程序依据可信身份、目标资源和实际授权核验调用；需要人决定的操作进入[[tool-approvals|审批]]。模型即使提出越权动作，也不能绕过检查直接执行。[[agent-sandbox|沙箱]]再限制文件、网络与资源访问，缩小误操作或恶意代码的影响。

输入、工具结果和回答的过滤也可通过[[langchain-guardrails-summary|中间件]]落实，但内容检测仍可能漏判。程序能强制执行既定权限与拒绝结果，不代表它能识别所有攻击或泄露；尚未通过必要检查的动作保持未执行，检查故障也不能默认放行。

[[agent-evaluation#任务与验收|验证防护]]时，既要观察合法任务能否完成，也要核对被禁止的读取、外发或修改确实没有发生，不能只看模型是否回复「已拒绝」。
