---
title: "Grafana"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["Grafana", "看板", "告警"]
aliases: ["Grafana 看板", "Grafana 告警"]
---

**Grafana 连接不同数据源，把查询结果展示成面板和仪表盘，并提供告警能力。** 指标、日志和 Trace 通常存在各自的后端，**Grafana 自己的配置存储代替不了这些观测数据**。

- 打开面板时，Grafana 按数据源、时间范围和查询取结果，再做转换与绘图。[[prometheus|Prometheus]] 提供指标，[[loki|Loki]] 提供日志，Trace 后端提供链路；面板里的聚合与转换只影响展示，不会改写源数据、也修不了缺失的埋点。
- 变量可以切换服务、环境和实例，统一看板适合从总体异常逐步定位到具体对象；但面板过多、时间范围过宽、查询太贵会压垮数据源，要控制刷新频率和查询范围。
- **告警规则要区分阈值触发、无数据和查询失败**：无数据可能来自服务停机、抓取失败或查询条件写错，**不能默认当作健康**。多实例部署还要共享必要配置，并处理评估与通知的重复。
- 看板、数据源配置和权限应纳入版本与访问管理；共享看板或开放数据源会扩大可见范围，要理清组织、文件夹和后端权限的边界。

能力与配置见 [数据源](https://grafana.com/docs/grafana/latest/datasources/)、[仪表盘](https://grafana.com/docs/grafana/latest/dashboards/) 和 [告警文档](https://grafana.com/docs/grafana/latest/alerting/)。
