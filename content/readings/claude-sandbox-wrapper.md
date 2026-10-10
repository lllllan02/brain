---
parent: claude-sandbox-overview
title: "Claude 的公开沙箱运行时如何包装命令"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[`wrapWithSandbox`](https://github.com/anthropics/sandbox-runtime/blob/4160dcde76f9905268cb76826381665c422bfbf6/src/sandbox/sandbox-manager.ts#L1879)"]
---

**Claude 使用的公开 `sandbox-runtime` 负责生成受限启动命令；真正执行命令的是调用方。**

## 包装接口做了什么

`wrapWithSandbox` 读取文件与网络配置，等待必要的网络初始化，再按平台分派：macOS 生成 Seatbelt 相关包装，Linux 交给 bubblewrap 等机制组织环境。

工作目录、读写路径、代理端口和桥接 socket 都需要传入正确位置。返回的字符串描述“怎样启动”，不代表程序已经进入沙箱；实际用法见 [[srt-sandbox-practice|srt 配置与启动]]。

## 能从这份源码确认到哪里

它可以解释公开库的包装机制，但最终保护范围还取决于调用方是否使用包装结果及所传配置，不能单独证明 Claude Code 每一种工具都经过同一个入口。

继续追踪网络可看[[claude-sandbox-network|Linux 网络隔离与代理]]；[[claude-sandbox-devcontainer|devcontainer]]则覆盖整个开发环境，是另一层边界。

阅读范围：sandbox-runtime `4160dcd`，不等于 Claude Code 全部内部实现；未运行验证。
