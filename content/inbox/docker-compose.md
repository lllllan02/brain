---
title: "Compose 与 Dockerfile 分别描述什么？"
category: "容器"
updated_at: "2026-10-07"
tags: ["Docker", "Compose", "容器网络"]
---

Dockerfile 描述镜像的构建过程，Compose 描述一组服务如何使用镜像、网络、挂载和运行参数共同启动。二者可以配合，但 Compose 并不要求所有服务都由本地 Dockerfile 构建。

服务配置 `image` 可以直接使用已有镜像，配置 `build` 才引入相应构建过程。需要把源码修改放入镜像时，应明确执行构建或使用 `up --build`，不能把每次 `up` 都理解为无条件重新构建。

Compose 网络中的服务通常用服务名互相访问。一个容器里的 `localhost` 指向它自身；服务间连接应使用目标服务的容器端口，宿主机映射端口用于从相应外部入口访问。持久数据应落在明确的挂载或外部存储中，生命周期区别见 [[container-images|容器与镜像]]。

启动顺序不等于依赖已经可用。`depends_on` 的普通依赖关系主要约束启动顺序；需要等数据库就绪时，可结合 healthcheck 和 `service_healthy` 条件。应用仍应处理依赖运行中断线与恢复，不能只依赖启动检查。[Compose 启停顺序](https://docs.docker.com/compose/how-tos/startup-order/)

Compose 适合描述多服务环境，但这一描述本身不提供跨机器调度、数据复制或完整 [[failover|故障切换]]。评估部署能力时，需要把进程重启、流量切换和数据恢复分开。
