---
title: "AutoGen：群聊如何选择下一位 Agent"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-17T23:05:45+08:00"
source: "https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html"
learning_status: pending
---

AutoGen 的 `SelectorGroupChat` 让成员轮流广播消息，并根据共享历史选择下一位发言者。它用于需要回应彼此发现的协作，不代表所有成员并发执行。以下节选官方机制与示例，核对于 2026-10-17，未运行示例。

## 怎样运行？

收到任务后，选择器结合历史、成员名称与描述选人；被选成员回复并广播，团队检查停止条件。未结束就继续选人，结束后返回本轮历史。默认由模型选择，也可用自定义函数选人或缩小候选范围。

示例由规划者分派搜索与分析工作，再由相应成员处理。搜索工具使用模拟数据，因此示例展示的是协作流程，不能证明真实检索质量。

## 工程使用的边界

成员描述会影响分派；共享历史便于接续，也会累积输入。任务结束后上下文仍被保留，需要清空时调用 `reset()`。消息数上限或指定文本可以触发退出，但退出条件是否满足与业务结果是否正确需要分别检查。
