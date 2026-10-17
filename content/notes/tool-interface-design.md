---
learning_status: understood
title: "工具接口设计"
aliases: ["Tool Interface Design"]
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-17T10:53:24+08:00"
reading_suggestions:
  - openai-function-design-summary
  - anthropic-tool-design-summary
  - agent-trace
---

**工具接口设计（Tool Interface Design）是对工具名称、用途、参数和返回值的约定，让模型能够选对工具、填对输入、读懂结果。**

1. [[assets/tool-interface-purpose.txt|工具用途清楚]]：名称与说明交代做什么、何时使用、是否修改数据。按任务组织接口，固定连用的操作可合并；中途需要判断或确认时保留边界，避免职责重叠。这也是 [[anthropic-tool-design-summary|Anthropic 工具设计建议]]关注的粒度问题。
2. [[assets/tool-interface-parameters.txt|参数减少猜测]]：明确类型、必填项、单位和默认行为，用枚举限制有限选项。程序已确定的值由程序补入，模型只填写需要选择的内容；执行端仍须校验。这符合 [[openai-function-design-summary|OpenAI 函数定义建议]]的分工。
3. [[assets/tool-interface-results.txt|结果支持下一步判断]]：保留必要信息与后续操作所需标识，区分已受理、处理中、已完成和失败。分页或截断应能继续读取，错误应说明具体原因与可修正项。

接口效果用实际任务和[[agent-trace|调用轨迹]]检验，重点观察选错工具、参数错误与结果误读。
