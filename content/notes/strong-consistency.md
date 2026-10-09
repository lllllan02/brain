---
title: "强一致性（Strong Consistency）"
category: "分布式系统"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["一致性"]
aliases: ["Strong Consistency"]
---

**强一致性（Strong Consistency）在分布式读写的常见语境中，是指数据更新成功后，随后发起的读取必须看到最新结果，不能返回已被该更新替代的旧值。**

例如，A 写入 `x=10` 并收到成功响应，随后 B 才发起读取，在没有其他写入的情况下，必须得到 `10`。

强一致性是一个相对宽泛的术语，通常用来指[[linearizability|线性一致性（Linearizability）]]，但不同技术文档可能赋予它不同含义，具体保证应以文档定义为准。
