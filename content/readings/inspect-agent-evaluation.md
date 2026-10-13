---
title: "Inspect：任务、执行器、评分器与隔离环境"
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T10:53:04+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://inspect.aisi.org.uk/tasks.html", "https://inspect.aisi.org.uk/sandboxing.html", "https://inspect.aisi.org.uk/scoring.html", "https://inspect.aisi.org.uk/metrics.html"]
---

Inspect 将一次评测组织成 Dataset、Solver 和 Scorer：**「数据提供任务，执行器调用模型或运行 Agent，评分器根据输出和环境证据给分」**。本文节选官方的任务、沙箱、评分与统计文档，核对于 2026-10-13，未运行框架。

## 任务怎样成为可重复实验？

[Task](https://inspect.aisi.org.uk/tasks.html) 把数据与执行、评分绑定，并配置重复轮次、模型、预算和版本。一个 Sample 可以带输入、目标及初始化文件；Solver 可以是一次生成，也可以是多步工具循环。评分规则独立配置，便于同一任务比较不同执行方式。

[Sandboxing](https://inspect.aisi.org.uk/sandboxing.html) 解决工具操作文件、执行程序时的隔离问题。指定 Docker 沙箱不代表全部 Python 逻辑都进了容器；工具或评分器必须通过 sandbox 接口把操作交给环境。这个边界决定了测试代码在哪里运行、能访问什么。

## 分数与运行错误怎样处理？

[Scoring](https://inspect.aisi.org.uk/scoring.html) 支持规则、模型及自定义评分器，也允许延后评分和对日志重新评分。评分政策单独处理无法评分的结束状态，避免把运行系统故障全部解释为能力不足。重新评分只改变对已有记录的判断，不会重新执行 Agent。

[Metrics](https://inspect.aisi.org.uk/metrics.html) 提供均值、准确率、置信区间、重复轮次归约与聚类标准误。多个样本来自同一来源时，可按分组计算不确定性；二元结果可用 Wilson 区间。指标配置不会自动决定正确的分组，样本依赖关系仍须由实验设计者识别。

这一框架减少了执行、日志与统计的重复建设；任务能否完成、验收是否公平、环境是否等价，**「仍需用参考解和失败样例验证」**。
