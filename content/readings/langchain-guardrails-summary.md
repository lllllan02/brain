---
title: "LangChain：行为检查如何接入 Agent"
parent: guardrail-execution
category: "Agent"
tags: ["Agent", "行为约束"]
created_at: "2026-10-13T10:52:05+08:00"
updated_at: "2026-10-13T11:04:15+08:00"
source:
  - "[Guardrails](https://docs.langchain.com/oss/python/langchain/guardrails)"
  - "[Custom middleware](https://docs.langchain.com/oss/python/langchain/middleware/custom)"
---

**LangChain 通过中间件在运行中的指定位置检查内容，并改变后续执行。** 本文聚焦官方文档中的检测方法、敏感信息处理与接入位置，不复述完整 API。

## 检测方法与取舍

确定性检查使用正则、关键词或明确条件，成本低、行为可预测，但难以覆盖语义变化；模型或分类器能判断上下文含义，代价是额外延迟与费用。原文将两者作为可组合的方法。

## 检测到之后怎样处理？

个人可识别信息（PII）中间件可删除敏感值并放入占位符、局部遮盖、哈希替换，或直接报错阻止继续。原文以邮箱与信用卡说明：选择取决于后续是否还需要部分信息；「检测到敏感信息」不只有拒绝一种结果。

## 中间件的位置决定检查范围

`before_agent` 示例在整次运行开始时检查输入，命中后结束执行；`after_agent` 示例检查最终回答，必要时替换。模型与工具调用周围也可设置检查。原文把输入过滤、PII 处理、敏感工具审批和最终回答检查组合到同一 Agent 中。

## 工具包装器怎样阻止执行？

[自定义中间件的 Wrap-style hooks](https://docs.langchain.com/oss/python/langchain/middleware/custom#wrap-style-hooks)把请求和后续处理函数 `handler` 交给包装器。包装器决定是否调用 `handler`：零次表示短路，一次是正常执行，多次可用于重试。这解释了检查为何能阻止动作：拒绝分支不进入实际处理函数，而非只向模型增加一句警告。

`before_agent` 每次运行执行一次，`before_model` 则在每次模型调用前执行；`wrap_tool_call` 包裹具体工具调用。检查对象和检查频率不同，不能互换使用。

多个中间件组合时，`before_*` 按声明顺序执行，`after_*` 反向执行，`wrap_*` 逐层嵌套，最先声明的包装最外层。因此需核对短路和重试发生在哪一层，不能把所有钩子理解为一条固定的顺序列表。官方建议优先使用内置中间件，并在集成前独立测试自定义逻辑。

以上节选接入机制，未覆盖状态合并等完整 API；文档没有给出攻击检出率或无泄漏保证。按 2026-10-13 页面核对，未运行 SDK 示例，使用时需核对安装版本。
