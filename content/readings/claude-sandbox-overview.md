---
parent: agent-sandbox
title: "Claude Code 沙箱源码阅读入口"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这组导读从 Claude 的公开命令包装库追到 Linux 网络隔离，再比较开发容器覆盖的范围。** 材料为 sandbox-runtime `4160dcd` 与 claude-code `2301018` 的公开配置，不代表 Claude Code 全部内部工具实现；未运行验证。

建议按以下顺序阅读，先分清包装与执行，再看具体边界：

1. [[claude-sandbox-wrapper|命令怎样包装]]：配置如何变成受限启动命令，包装库与调用方各负责什么。
2. [[claude-sandbox-network|Linux 网络怎样受控]]：命名空间如何限制直连，桥接与代理如何提供可过滤的出口。
3. [[claude-sandbox-devcontainer|Bash 沙箱与 devcontainer]]：单条命令和整个开发环境有什么区别，挂载持久化与防火墙有哪些边界。

实际启动与清理见 [[srt-sandbox-practice|srt 实践]]；文件、网络和生命周期等通用问题见[[agent-sandbox|沙箱主线]]。对照另一套执行链路，可从[[codex-sandbox-overview|Codex 源码入口]]开始。
