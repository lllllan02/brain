---
title: "负载均衡（Load Balancing）"
category: "网络服务"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["负载均衡", "服务发现"]
aliases: ["Load Balancing"]
---

**负载均衡（Load Balancing）是按一定策略将请求或计算任务分配给多个服务器或服务实例的技术，用于分散负载，提高系统的吞吐量、可用性和扩展能力。**

在服务调用中，基本过程是 **「获取候选实例 → 按策略选择实例 → 发起请求」**。常见策略有轮询、随机、加权轮询和最少连接数；例如三个实例采用轮询时，请求依次分给 A、B、C，再从 A 开始。

负载均衡通常配合健康检查或故障反馈排除异常实例，把后续请求分给其他可用节点；增加实例也能分担流量，但不保证请求一定成功或容量按节点数等比例增长。

它可以由 [[nginx|Nginx]]、HAProxy、LVS 或云负载均衡服务完成，也可以由客户端在[[service-discovery|服务发现]]取得实例列表后自行选择。[[reverse-proxy|反向代理]]强调代后端收发请求，负载均衡强调在多个实例间分配请求，两者经常配合，但不是同一概念。

参考：[Nginx HTTP 负载均衡](https://nginx.org/en/docs/http/load_balancing.html)。
