---
title: "Nginx"
category: "网络服务"
updated_at: "2026-10-08"
tags: ["Nginx", "反向代理", "Web 服务器"]
aliases: ["Nginx"]
---

**Nginx 是一个 Web 服务器兼反向代理服务器**：它接收客户端请求，按监听地址、主机名和路径选择处理规则，然后返回静态内容或把请求转发给后端。

配置里几个概念一一对应：`http` 装全局 HTTP 规则，`server` 对应虚拟主机，`location` 匹配请求路径，`upstream` 描述一组后端，`proxy_pass` 指定转发目标。**路径是否带斜杠、location 用哪种匹配方式，都会影响转发出的 URI**——不能把示例地址一换就假定行为一致。

转发、负载均衡与缓存见[[reverse-proxy|反向代理]]。基础机制见 [请求处理过程](https://nginx.org/en/docs/http/request_processing.html)。
