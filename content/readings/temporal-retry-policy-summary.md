---
title: "Temporal：用策略约束重试与停止条件"
parent: retry-decision
category: "分布式系统"
tags: ["重试", "超时"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Retry Policies](https://docs.temporal.io/encyclopedia/retry-policies)"
---

**Temporal 用声明式重试策略规定何时再执行、等待多久，以及何时停止；操作级重试和整条流程重跑是不同层次。**

## 重试发生在哪里

Activity 是执行外部调用等操作的单元，默认带重试策略；Workflow Execution 默认没有重试策略。Activity 重试会重新派发执行任务，因此业务代码仍需能安全重复执行。

## 策略包含哪些约束

- 初始间隔、退避系数和最大间隔：控制等待时间如何增长。
- 最大尝试次数：包含第一次执行，设为 1 表示不重试；0 表示不限制次数。
- 不可重试错误：按错误类型排除，或将应用错误明确标为不可重试；永久性错误应尽早返回。

次数之外，还要限制总时间。文档建议用 Activity 的 `Schedule-To-Close` 超时覆盖整个执行及重试过程；每次执行的超时不能替代总期限。[策略字段](https://docs.temporal.io/encyclopedia/retry-policies#properties)

某次错误还可以指定下一次等待时长，覆盖常规退避间隔，但仍受最大尝试次数和总超时约束。由此可见，重试策略既要决定「再试吗」，也要明确「什么时候不再试」。

原文提供多语言的不可重试错误示例及策略配置链接。按 2026-10-10 文档总结，未运行示例。
