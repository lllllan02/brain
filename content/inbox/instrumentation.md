---
title: "埋点（Instrumentation）"
category: "可观测性"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["埋点", "可观测性"]
aliases: ["Instrumentation", "数据埋点"]
---

**埋点（Instrumentation）是在程序的关键位置加入数据采集逻辑，记录关心的事件、行为或运行状态，供后续监控、分析和问题排查使用。** 例如，在 API 请求开始和结束处记录时间、响应状态与错误信息，就能分析请求耗时和失败情况。

埋点既可用于业务分析，如点击、访问和转化统计，也可用于系统可观测性，产生指标、日志或追踪数据。[[tracing-instrumentation|追踪埋点]]是其中一种用法，负责记录操作并关联成调用链。
