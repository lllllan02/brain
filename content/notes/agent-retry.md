---
learning_status: understood
parent: agent
title: "Agent 重试"
aliases: ["Agent Retry", "Task Retry"]
category: "Agent"
tags: ["Agent", "重试"]
created_at: "2026-10-09"
updated_at: "2026-10-17T15:22:45+08:00"
reading_suggestions:
  - retry-decision
  - retry-wrapper
  - pydantic-retries-summary
  - agent-checkpoint-recovery
  - agent-feedback-mechanisms
---

**Agent 重试（Retry）是在调用失败或校验未通过后，按策略再次尝试相应操作的恢复机制。** 模型请求、工具执行与输出校验都可接入同一套重试控制。

程序按[[retry-decision|失败原因、安全性与剩余预算]]分流：暂时故障在有限次数内退避重试，输入或条件有误先修正，不可恢复、用户取消或预算耗尽就退出。再次失败需重新判断，不能无条件重复执行。

![[assets/agent-retry-routing.png|失败进入判断层，分流为等待重试、先修正或停止；发送前复核，失败后重新判断]]

## 关键边界

- 只重做必要部分：保留已有有效结果。写操作超时可能已经生效，先核查或按接口约定使用幂等机制，避免重复副作用。
- 限制整次任务的消耗：[[pydantic-retries-summary|多层重试]]可能使请求数成倍增加，各层应明确分工并共享总期限、调用量与费用预算；等待也计入总时间。底层重发不可见时，应关闭或按保守上限预留。
- 明确执行分工：SDK 或[[retry-wrapper|重试包装器]]负责等待与重发；需要修正时，由模型修改参数或输出，或由程序修复前置条件。程序仍需校验新结果，再次尝试不保证成功。

重试可与[[agent-feedback-mechanisms|反思、自我纠正和重新规划]]组合；任务中断后，由[[agent-checkpoint-recovery|检查点恢复]]确定接续位置，不默认整段任务从头重跑。
