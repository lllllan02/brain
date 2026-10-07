---
title: "Nginx 如何把请求转发到后端？"
category: "网络服务"
updated_at: "2026-10-07"
tags: ["Nginx", "反向代理", "负载均衡"]
type: "concept"
---

Nginx 接收客户端请求，按监听地址、主机名和路径选择处理规则，再提供静态内容或把请求转发给后端。反向代理通常建立客户端到 Nginx、Nginx 到上游两段连接，并不是让客户端改连后端。

配置中的 `http` 包含 HTTP 规则，`server` 对应虚拟主机，`location` 匹配请求路径，`upstream` 描述一组后端，`proxy_pass` 指定转发目标。路径是否带斜杠以及 location 的匹配方式会影响转发 URI，不能把示例地址替换后就假定行为完全相同。

Master 负责配置和进程管理，Worker 用事件驱动方式处理连接。平滑重载通常让新 Worker 接收新请求、旧 Worker 逐步结束已有连接；这不意味着所有长连接都能在任何配置变化下立即无损迁移。

负载均衡把请求分配给多个后端，但仍需定义连接上限、失败重试和超时。代理超时中有些约束的是两次读写之间的空闲间隔，不能直接当作整个请求的总预算，业务链路仍需 [[rpc-timeout-budget|截止时间]]。

缓存和缓冲可以减轻后端压力，也会改变流式响应与大文件传输的行为。是否启用应按响应模式决定。主动健康检查等能力还存在版本或产品差异，不能把商业版本配置直接假设为开源版本可用。

基础机制见 [请求处理过程](https://nginx.org/en/docs/http/request_processing.html)；路径重写、缓冲和超时语义见 [proxy 模块](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)。
