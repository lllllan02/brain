---
title: "Docker Compose"
category: "容器"
updated_at: "2026-10-08"
tags: ["Docker", "Compose", "容器网络"]
aliases: ["Compose", "docker-compose"]
---

**Dockerfile 描述镜像怎么构建，Compose 描述一组服务如何用镜像、网络、挂载和运行参数一起启动。** 二者可以配合，但 Compose 不要求所有服务都由本地 Dockerfile 构建。

- 服务配置 `image` 直接用已有镜像，配 `build` 才引入构建过程。**要把源码改动放进镜像，就得明确构建或 `up --build`**，不能把每次 `up` 都当成无条件重新构建。
- **网络**：Compose 网络里的服务通常用服务名互访。容器里的 `localhost` 指向它自己；服务间连接用目标服务的容器端口，宿主机映射端口是从外部入口访问用的。持久数据应落在明确的挂载或外部存储里，生命周期区别见 [[container-images|容器与镜像]]。
- **启动顺序 ≠ 依赖可用**：`depends_on` 的普通依赖主要约束启动顺序；要等数据库就绪，可结合 healthcheck 和 `service_healthy` 条件。应用仍要处理依赖中途断线和恢复，不能只靠启动检查。[Compose 启停顺序](https://docs.docker.com/compose/how-tos/startup-order/)
- Compose 适合描述多服务环境，但这个描述本身**不提供跨机器调度、数据复制或完整 [[failover|故障切换]]**。评估部署能力时，把进程重启、流量切换和数据恢复分开看。
