---
learning_status: pending
title: "Agent 评测（Evaluation）"
parent: agent
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T11:03:11+08:00"
updated_at: "2026-10-13T11:06:45+08:00"
reading_suggestions:
  - agent-evaluation-design
  - agent-evaluation-graders
  - agent-evaluation-harness
  - agent-evaluation-trajectory
  - agent-evaluation-statistics
  - agent-evaluation-safety
  - agent-evaluation-benchmarks
  - agent-evaluation-tools
  - agent-evaluation-practice
  - agent-evaluation-online
---

**Agent 评测是在明确任务、环境和资源约束下，让 Agent 实际执行，再依据结果与过程证据判断能力、可靠性和代价的方法。** 它帮助回答三类问题：任务能否完成，改动是否改善，以及系统是否适合实际使用。

订单 Agent 说「已退款」，只说明生成了这句话。评测还要查订单是否正确、账本是否写入、是否获得所需确认，以及是否重复执行。一次运行通过后，还需换任务与重复试次，区分稳定能力和偶然成功。

基本链路是：**「任务与环境 → Agent 执行 → 结果与轨迹 → 独立评分 → 版本比较与改进」**。[[anthropic-agent-evals-summary|Anthropic 的评测方法]]提供任务、试次、评分器与结果之间的整体框架。

## 先决定什么算成功

[[agent-evaluation-design|目标与数据集设计]]把用户需求转成任务、初始状态和可核验条件，区分结果、约束、交互与效率，并说明正常、边界、错例和保留集怎样组合。数据集范围决定结论能够推广到哪里。

[[agent-evaluation-graders|评分器与裁判校准]]再决定哪些条件由程序检查，哪些由模型或人工判断。程序测试也可能漏检，模型裁判也可能误判；参考解和故意构造的错误解用于检验评测本身。

## 再理解为什么成功或失败

[[agent-evaluation-trajectory|结果、轨迹与归因]]把终态验收和过程约束分开：退款账本正确，不保证执行前已经确认；工具顺序不同，也不一定错误。分层实验用于定位问题，最终仍要回到整项任务验证。

专项能力复用已有范围：[[rag-quality-evaluation|RAG 评测]]区分召回、重排、上下文与回答；[[agent-memory-evaluation|记忆评测]]检查跨会话写入、读取与纠正；[[context-compaction-evaluation|压缩评测]]检查信息保留和任务延续。局部指标帮助定位瓶颈，不能单独替代端到端成功率。

## 让不同运行可以比较

[[agent-evaluation-harness|评测运行系统]]负责环境重置、执行限额、证据和结果保存，隔离被测程序与验收信息。[[agent-evaluation-statistics|随机性与统计比较]]说明一次通过、多次中至少一次通过和多次全部通过的差别，并处理任务切片、缺失结果和分数不确定性。

长期运行还会遇到攻击、超时和中断。[[agent-evaluation-safety|安全与鲁棒性评测]]在受控故障和威胁条件下，同时检查任务完成和不当副作用，避免把「拒绝一切」误当作可用的安全方案。

## 从公开方法走到自己的实现

[[agent-evaluation-benchmarks|Benchmark 的覆盖与边界]]比较编码、终端、界面、客服、工具调用、研究和安全基准。公开分数可以帮助定位能力，但自己的模型、工具、权限与任务分布仍需单独验证。

[[agent-evaluation-tools|工具分工与选型]]区分评测执行、数据实验平台和局部评分库；[[agent-evaluation-practice|订单评测实践]]用可运行的 Go 示例展示输入隔离、独立账本、评分证据及错误检测，再说明如何接入真实 Agent。

## 上线以后怎样继续改进

[[agent-evaluation-online|离线回归与线上评测]]将发布前比较、生产抽审、灰度和 A/B 的作用分开。线上发现的问题沿[[agent-trace-evaluation|Trace 错例回流]]转成带环境和独立验收的新用例，再用于下一轮回归。

评测支持有条件的判断。通过某个任务集不代表覆盖全部业务，代理指标也不自动等于用户收益；每次结论都应带上所测任务、运行与评分版本，以及仍未验证的边界。
