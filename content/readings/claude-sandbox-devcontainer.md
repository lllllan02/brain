---
parent: claude-sandbox-overview
title: "Claude Code 的 Bash 沙箱与 devcontainer 有何区别"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**两者覆盖的对象不同：Bash 沙箱约束进入该路径的命令，devcontainer 为整套开发环境提供容器边界。** 它们可以组合，不能互相代称。

[devcontainer 配置](https://github.com/anthropics/claude-code/blob/2301018b1f61073c501a8e7a4813ef48c239163b/.devcontainer/devcontainer.json#L1)把项目挂到 `/workspace`，另用卷保存历史与 Claude 配置；容器中的文件是否持久化，要看对应挂载，删除容器不等于撤销项目改动。

[初始化防火墙脚本](https://github.com/anthropics/claude-code/blob/2301018b1f61073c501a8e7a4813ef48c239163b/.devcontainer/init-firewall.sh#L1)利用容器网络管理能力配置默认拒绝和允许规则。它包含 DNS、SSH、宿主网段等例外，并把部分域名解析为 IP 加入集合，因此不能描述成「只允许这些域名的所有请求」。

容器便于统一依赖，但还需管理镜像、挂载与网络权限；[[claude-sandbox-wrapper|Bash 运行时包装]]则更接近单条命令的受限执行。选择时先确定需要隔离的[[sandbox-lifecycle|环境范围与生命周期]]。

阅读范围：claude-code `2301018` 的公开 devcontainer，以及 sandbox-runtime `4160dcd`；未在此运行容器。
