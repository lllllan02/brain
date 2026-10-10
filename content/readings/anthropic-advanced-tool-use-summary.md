---
title: "Anthropic：工具搜索、程序调用与使用示例"
parent: claude-tool-search
category: "Agent"
tags: ["Agent", "工具调用", "按需加载"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**文章把工具使用的瓶颈分为定义过多、中间结果过大和参数使用不准，分别用搜索、程序调用和示例改善。** 应先识别瓶颈，再选择机制。

来源：[Introducing advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)，Anthropic，2025-11-24。本文总结设计思路，发布时的 API 配置与实验结果不视为所有版本、模型的通用结论。

## 按需搜索解决什么

工具定义全部进入上下文会占用预算，相似工具还可能干扰选择。文章采用「少量常驻工具 + 延迟加载目录」：模型先搜索，命中工具引用后展开完整定义，再正常调用。定义仍需提供给 API，延迟的是进入模型上下文的时机。

工具名称与描述要便于检索，也需让模型知道有哪些能力可找。搜索增加交互延迟，工具少且选择准确时未必值得引入；应比较上下文消耗、选择质量和耗时，而非照搬文中的数量阈值。[工具搜索](https://www.anthropic.com/engineering/advanced-tool-use#:~:text=How%20the%20Tool%20Search%20Tool%20works)

## 另外两种机制

- 程序化工具调用：用代码完成循环、条件与结果处理，减少把全部中间结果交给模型的需要。
- 工具使用示例：补充 Schema 难以表达的参数搭配和业务惯例；示例本身也消耗上下文。

三者处理不同问题，可以按需组合。作者的内部测试可作为设计动机，实际收益仍需在自己的任务上验证。[按瓶颈选择机制](https://www.anthropic.com/engineering/advanced-tool-use#:~:text=Layer%20features%20strategically)
