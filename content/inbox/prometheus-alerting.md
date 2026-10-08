---
title: "Prometheus 告警"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["Prometheus", "告警", "Alertmanager"]
aliases: ["告警规则", "Alertmanager"]
---

**Prometheus 的告警由两部分组成：[[prometheus|Prometheus]] 本身按告警规则（alerting rules）判断是否触发，Alertmanager 负责分组、抑制和通知路由。**

一个常见坑：`up=1` 只表示抓取成功，**不代表业务正常**。告警要结合业务成功率、延迟和依赖状态，并处理低流量与无数据的情况——没有数据不等于健康。

通知职责见 [Alerting](https://prometheus.io/docs/alerting/latest/overview/)。
