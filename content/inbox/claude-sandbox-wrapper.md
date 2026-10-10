---
parent: claude-sandbox-overview
title: "Claude 的公开沙箱运行时如何包装命令"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**`sandbox-runtime` 的命令包装接口负责生成受限启动方式，调用方负责真正执行。** 返回包装后的命令，不等于程序已经在沙箱内运行。实际使用见[[srt-sandbox-practice|srt 配置与启动]]。

[`wrapWithSandbox`](https://github.com/anthropics/sandbox-runtime/blob/4160dcde76f9905268cb76826381665c422bfbf6/src/sandbox/sandbox-manager.ts#L1879)读取文件与网络配置、等待必要的网络初始化，再按平台分派：macOS 生成 Seatbelt 相关包装；Linux 交给 bubblewrap 等机制组织执行。

包装中需要把工作目录、读写路径、代理端口或桥接 socket 传到正确的位置。最终保护范围取决于实际执行这个结果的调用方，以及提供的配置。

因此这份公开库能说明命令包装机制，不能单独证明 Claude Code 每一种工具都经过同一个入口。[[claude-sandbox-network|Linux 网络实现]]可继续追踪具体边界；[[claude-sandbox-devcontainer|devcontainer]]则是覆盖另一层环境的方案。

阅读范围：sandbox-runtime `4160dcd`；这是 Claude Code 使用的公开运行时，不等于 Claude Code 的全部内部实现。
