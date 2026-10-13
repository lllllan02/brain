---
title: "Promptfoo：用配置和断言组织评测"
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T10:53:04+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://www.promptfoo.dev/docs/configuration/reference/", "https://www.promptfoo.dev/docs/configuration/expected-outputs/"]
---

Promptfoo 将 prompts、providers、tests 和 assertions 组织成可重复执行的评测配置。本文节选 2026-10-13 官方配置与断言文档，未安装或调用模型。

## 配置怎样连接执行与验收？

[配置文档](https://www.promptfoo.dev/docs/configuration/reference/) 用测试变量生成输入，通过 provider 调用模型或应用，再由断言检查输出。同一测试可比较多个提示词或被测系统，适合把回归放进版本管理与 CI。

[断言文档](https://www.promptfoo.dev/docs/configuration/expected-outputs/) 包含字符串、JSON、脚本、模型评分，以及成本和延迟等检查；可以命名指标并组合条件。运行成功与断言通过是不同结果，配置加权评分时还需明确哪些条件必须单独通过。

## Agent 场景还需提供什么？

完整 Agent 可以通过适配层接受输入并返回结果；如果要**「核对中间调用和外部状态」**，需要向评分器暴露相应证据。仅收到一段最终文本的断言无法证明数据库状态正确。

它适合已经有应用入口、希望统一比较和自动回归的场景；有复杂沙箱生命周期时，**「仍要由环境管理或其他框架补齐」**。这里的适用判断基于组件分工，不代表对其他工具的性能测试。
