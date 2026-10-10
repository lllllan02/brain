---
title: "Anthropic：如何设计有效的 Agent 工具"
parent: tool-interface-design
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**文章的核心观点是：工具设计应减少 Agent 在选择、理解和执行任务时的不必要负担，并通过任务评测验证效果。** 接口能调用，只证明接通了系统；模型是否容易正确使用，还取决于工具边界、说明和返回信息。

来源：[Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)，Anthropic，2025-09-11。以下总结作者实践，不代表所有模型与任务的固定最优方案。

## 按任务设计工具

工具多、功能细，不一定更有效。机械包装底层 API，会让模型承担额外的选择、拼接和阅读成本。可以把常用的确定性步骤合并，把筛选交给程序，例如搜索相关日志，而非返回全部日志让模型逐条找。[工具选择与粒度](https://www.anthropic.com/engineering/writing-tools-for-agents#:~:text=Choosing%20the%20right%20tools%20for%20agents)

## 让模型看懂并继续行动

- 名称与描述要交代职责、参数含义和适用边界；工具较多时，用服务或资源前缀区分，减少功能重叠带来的混淆。
- 返回任务需要的信息，同时保留后续调用所需的标识；可提供简略与详细模式，兼顾阅读成本和继续操作。
- 用筛选、分页控制输出；截断或报错时给出可采取的下一步，避免模型反复猜测。

对应原文：[描述设计](https://www.anthropic.com/engineering/writing-tools-for-agents#:~:text=Prompt-engineering%20your%20tool%20descriptions)、[返回信息](https://www.anthropic.com/engineering/writing-tools-for-agents#:~:text=Returning%20meaningful%20context%20from%20your%20tools)、[输出与错误反馈](https://www.anthropic.com/engineering/writing-tools-for-agents#:~:text=Optimizing%20tool%20responses%20for%20token%20efficiency)。

## 用评测检验设计判断

原型 → 真实任务评测 → 检查调用记录 → 修改 → 独立测试任务验证。

评测既看任务是否完成，也看调用次数、耗时、Token 和错误。不要把某条调用路径设为唯一正确答案，也不要只听模型对失败的解释；应核对实际请求与结果。保留独立测试任务，防止修改只适应已有用例。[评测方法](https://www.anthropic.com/engineering/writing-tools-for-agents#:~:text=Running%20an%20evaluation)

## 如何用于接口评审

据上述观点，可以问：模型需要猜什么、程序能代劳什么、结果是否足以继续行动、改善如何验证？

例如，假设 Agent 为回答「哪些订单未发货」逐条查询详情，可以检查搜索摘要是否缺少发货状态，再比较补字段前后的正确率与调用量。不能仅凭调用多就合并工具；查询与退款之间的授权和决策边界仍应保留。这是应用上述观点的设计示例，未做实测。
