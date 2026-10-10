---
parent: claude-sandbox-overview
title: "Claude 的 Linux 沙箱如何组合网络隔离与代理"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[网络桥接实现](https://github.com/anthropics/sandbox-runtime/blob/4160dcde76f9905268cb76826381665c422bfbf6/src/sandbox/linux-sandbox-utils.ts#L1344)", "[目标过滤](https://github.com/anthropics/sandbox-runtime/blob/4160dcde76f9905268cb76826381665c422bfbf6/src/sandbox/sandbox-manager.ts#L458)"]
---

**Claude 的 Linux 沙箱将“阻止直连”与“允许受控出口”分开：网络命名空间负责隔离，宿主代理负责过滤。**

## 流量怎样走出去

沙箱程序 → 本地 HTTP／SOCKS 入口 → Unix socket 桥接 → 宿主代理 → 允许的外部目标。

bubblewrap 的 `--unshare-net` 建立隔离网络。为了仍能访问获准服务，运行时用 socat 在沙箱内 TCP 入口与 Unix socket 之间桥接，再把流量交给宿主代理。

## 为什么代理变量不够

代理变量只是告诉常见工具从哪里连接；程序可以不遵守变量。网络命名空间限制直接使用宿主网络的路径，代理则判断目标是否允许，两者共同形成[[sandbox-network|通道限制与请求检查]]。

socat 负责转发，不决定域名权限；域名过滤在代理逻辑中。被挂入沙箱的 socket 也是可用通道，因此其暴露范围同样属于需要检查的边界。

阅读范围：sandbox-runtime `4160dcd` 的 Linux 实现，不代表 Claude Code 全部内部工具路径；未运行验证。
