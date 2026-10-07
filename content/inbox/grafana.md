---
title: "Grafana 在观测系统中负责什么？"
category: "可观测性"
updated_at: "2026-10-07"
tags: ["Grafana", "看板", "告警"]
---

Grafana 连接不同数据源，把查询结果展示为面板和仪表盘，并提供告警能力。指标、日志和 Trace 通常保存在各自后端，Grafana 自己的配置存储不能代替这些业务观测数据。

用户打开面板后，Grafana 根据数据源、时间范围和查询获取结果，再进行转换与绘图。[[prometheus|Prometheus]] 提供指标，[[loki|Loki]] 提供日志，Trace 后端提供链路数据。面板中的聚合与转换影响展示，不会自动改写源数据或修复缺失埋点。

变量可以切换服务、环境和实例，统一看板适合从总体异常逐步定位到具体对象。但过多面板、过宽时间范围和高成本查询会压垮数据源，需要控制刷新频率和查询范围。

告警规则必须区分阈值触发、无数据和查询失败。无数据可能来自服务停机、抓取失败或查询条件错误，不能默认当作健康。多实例部署还需要共享必要配置，并处理告警评估与通知的重复问题。

看板、数据源配置与权限应纳入版本和访问管理。共享看板或开放数据源可能扩大可见范围，配置时需明确组织、文件夹和后端权限之间的边界。

能力与配置见 [数据源](https://grafana.com/docs/grafana/latest/datasources/)、[仪表盘](https://grafana.com/docs/grafana/latest/dashboards/) 和 [告警文档](https://grafana.com/docs/grafana/latest/alerting/)。
