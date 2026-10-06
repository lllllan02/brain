---
title: "Agent 如何把线上错例回流到评测集？"
updated_at: "2026-10-05"
tags: ["Agent"]
classes: ["concept"]
---

# Agent 如何把线上错例回流到评测集？

把一次线上失败转成**可复现、有明确通过标准、能反复运行的评测用例**，按「线上 Trace → 错例候选池 → 人工确认与归因 → 构造评测用例 → 入库 → 回归验证」形成闭环。

1. **线上 Trace**：保留任务输入、上下文、工具调用和结果，为后续判断提供证据。
2. **错例候选池**：根据异常信号筛选值得检查的记录，同时随机抽样发现未被规则覆盖的问题。
3. **人工确认与归因**：结合任务目标和执行证据，确认是否出错、失败位置及预期行为。
4. **构造评测用例**：固定必要输入与环境，把预期行为转成可执行的评分标准。
5. **入库**：检查可复现性、标注质量和重复情况，记录来源与版本。
6. **回归验证**：比较修改前后的通过率，确认已知问题修复且已有能力没有退化。

**候选池判断「值得检查」，人工确认判断「确实出错」**。错例回归集用于检验已知问题；代表性流量评测集用于衡量整体表现，二者分别统计。

参考：[LangSmith 对线上与离线评测的分工说明](https://docs.langchain.com/langsmith/evaluation-types)。

## 相关内容

- 上级主题：[[agent-evaluation-map|Agent 评测地图]]
- 展开：[[agent-trace-requirements|Agent 线上 Trace 需要记录什么，才能支持错例回流？]]
- 展开：[[agent-failure-candidate-selection|Agent 线上 Trace 凭什么进入错例候选池？]]
- 展开：[[agent-failure-triage|Agent 如何人工确认错例并定位失败原因？]]
- 展开：[[agent-failure-replay-cases|Agent 如何把确认的错例构造成可重放评测用例？]]
- 展开：[[agent-evaluation-case-admission|Agent 评测用例满足什么条件才能入库？]]
- 展开：[[agent-regression-evaluation|Agent 如何用回流错例做回归验证？]]
