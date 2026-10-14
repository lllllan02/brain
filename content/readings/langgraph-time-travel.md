---
title: "LangGraph：从检查点重放与分叉"
category: "Agent"
tags: ["Agent", "Checkpoint", "重放"]
created_at: "2026-10-12T23:28:23+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: "https://docs.langchain.com/oss/python/langgraph/use-time-travel"
reading_suggestions:
  - agent-checkpoint-recovery
---

**「LangGraph 的时间旅行依赖检查点：复用此前保存的状态，重新执行所选检查点之后的节点。」** 本文节选 Replay、Fork 与执行边界，依据 2026-10-12 官方文档，未运行示例。

通过 `get_state_history` 找到目标检查点，再将其配置传给 `invoke`，即可从该位置继续。原文用「生成主题 → 写笑话」说明：选中写笑话之前的检查点，只重新执行写笑话节点；最终检查点若无后续节点，重放不会执行新工作。

Fork 则先用 `update_state` 从旧检查点创建新分支，再继续运行。它保留原执行历史，不把整个线程回滚；状态更新还受节点写入与 reducer 语义影响。

**「检查点之后」的模型调用、API 请求和人工中断会再次发生。** 因此输出可能改变，外部写入也可能再次执行。默认继承检查点的子图只能在父级粒度重放；要进入子图内部的节点位置，需要相应的独立检查点配置。

这解释了 [[agent-checkpoint-recovery|检查点恢复]] 与 Trace 查看之间的差别：观测数据描述发生过什么，时间旅行需要可执行的状态与运行框架，**「并不自动提供无副作用的历史模拟」**。
