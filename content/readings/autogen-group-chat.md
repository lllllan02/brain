---
title: "AutoGen：群聊如何选择下一位 Agent"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-13T17:41:05+08:00"
source: "https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html"
read: false
---

**「SelectorGroupChat 用共享对话决定下一位发言者，群聊并不等于所有成员并发运行。」** 本文节选官方机制与示例说明，按 2026-10-13 文档核对。

一次运行按「根据历史和成员描述选择发言者 → 该成员生成回复 → 向其他成员广播 → 检查停止条件」推进。选择器可以使用模型，也可以由自定义函数控制，候选函数还能缩小可选范围。成员名称和描述因此会影响分派。

示例组合规划、搜索与数据分析三个角色；搜索工具使用模拟数据，不能将例子视为真实搜索质量的验证。结束后团队保留上下文，调用 reset 才清空，连续任务需注意是否应该继承先前信息。

文档展示了消息数上限与指定文本等终止条件。它们让程序知道何时退出；业务结果是否正确仍需单独判断。从架构上看，共享对话使成员能够回应彼此发现，也使广播内容持续进入协作上下文，不能仅凭角色数量推断吞吐量或正确性。
