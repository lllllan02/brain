---
parent: claude-sandbox-overview
title: "Claude 的 Linux 沙箱如何组合网络隔离与代理"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Linux 路径同时使用独立网络命名空间和受控代理：前者限制直连，后者检查出口。**

沙箱内程序 → 本地 HTTP／SOCKS 入口 → Unix socket 桥接 → 宿主代理 → 允许的外部目标。

[网络桥接实现](https://github.com/anthropics/sandbox-runtime/blob/4160dcde76f9905268cb76826381665c422bfbf6/src/sandbox/linux-sandbox-utils.ts#L1344)通过 bubblewrap 的 `--unshare-net` 隔离网络，再用 socat 在 TCP 与 Unix socket 之间转发。代理变量帮助常见工具找到入口，无法独立阻止绕过代理的连接。

[目标过滤](https://github.com/anthropics/sandbox-runtime/blob/4160dcde76f9905268cb76826381665c422bfbf6/src/sandbox/sandbox-manager.ts#L458)发生在代理相关逻辑中；socat 负责传输，不负责判断域名权限。没有提供桥接出口时，沙箱不能靠宿主默认网络直接访问外部服务。

这一组合解释了[[sandbox-network|通道限制与请求检查]]为什么需要配合。允许暴露哪些 socket 仍是边界的一部分，也需要纳入验证。

阅读范围：sandbox-runtime `4160dcd`；这是 Claude Code 使用的公开运行时，不等于 Claude Code 的全部内部实现。
