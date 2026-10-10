---
parent: claude-sandbox-overview
title: "Claude Code 的 Bash 沙箱与 devcontainer 有何区别"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[devcontainer 配置](https://github.com/anthropics/claude-code/blob/2301018b1f61073c501a8e7a4813ef48c239163b/.devcontainer/devcontainer.json#L1)", "[初始化防火墙脚本](https://github.com/anthropics/claude-code/blob/2301018b1f61073c501a8e7a4813ef48c239163b/.devcontainer/init-firewall.sh#L1)"]
---

**Bash 沙箱限制进入该路径的命令，devcontainer 则为整套开发环境提供容器边界；两者可以组合。**

## 容器覆盖什么

公开 devcontainer 配置把项目挂到 `/workspace`，并用独立卷保存历史和 Claude 配置。因此文件能否持久化取决于挂载，删除容器不会撤销已经写入工作区的改动。

这与[[claude-sandbox-wrapper|单条命令的包装]]不同：容器还承担开发依赖与环境配置，需要一起管理镜像、挂载和网络能力。

## 防火墙并非纯域名规则

初始化脚本配置默认拒绝和允许规则，但保留 DNS、SSH、宿主网段等例外，并把部分域名解析成 IP 集合。因此不能把它描述成“所有请求都严格按域名白名单过滤”。

选择时先明确要隔离的是一条命令还是整个开发环境，再核对[[sandbox-lifecycle|持久化与清理范围]]，不能用容器名称替代实际边界分析。

阅读范围：claude-code `2301018` 的公开 devcontainer，结合 sandbox-runtime `4160dcd`；未运行容器。
