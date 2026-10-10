---
parent: agent-sandbox
title: "Claude Code 沙箱源码阅读入口"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这组解析从公开运行时的命令包装，追到 Linux 网络边界，再比较开发容器的隔离范围。** 材料是 sandbox-runtime `4160dcd` 与 claude-code `2301018` 的公开配置，不能据此声称已读到 Claude Code 全部内部工具实现。

1. [[claude-sandbox-wrapper|命令怎样包装]]：配置如何变成受限启动方式，包装库与执行调用方各负责什么。
2. [[claude-sandbox-network|Linux 网络怎样受控]]：命名空间、Unix socket 桥接和代理怎样分工，为什么代理变量本身不够。
3. [[claude-sandbox-devcontainer|Bash 沙箱与 devcontainer]]：单条命令与整个开发环境的边界有什么区别，挂载和防火墙有哪些例外。

用法概览见[[srt-sandbox-practice|srt 的配置、启动与环境清理]]，其他实现方案见[[sandbox-implementations|实现方案与用法]]。

返回[[agent-sandbox|沙箱专题主线]]可看文件、网络、生命周期等通用问题；对照另一套实现时，从[[codex-sandbox-overview|Codex 源码入口]]开始。
