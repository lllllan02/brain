---
parent: sandbox-implementations
title: "Docker Sandboxes：面向 Agent 的沙箱产品"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Docker Sandboxes 本地产品为 Agent 创建独立内核的 microVM，宿主侧代理再管理网络与凭据。** 虚拟机负责执行环境的隔离，代理负责检查请求和注入认证，两者分工配合。

使用 `sbx` CLI 管理这套环境，不能直接套用 `docker run` 的全部参数。

**[[docker-sandbox-practice|普通 Docker 容器]]与 Docker Sandboxes 各有用途，不是旧版与新版的替代关系。** 自己运行脚本、测试或搭建执行平台时，普通容器便于定制，但文件权限、网络出口和凭据保护需要自己组织；希望直接运行受支持的编码 Agent 时，Sandboxes 提供整合好的环境，但要接受产品支持的平台、配置方式和工作流。

Sandboxes 也不只是封装几个 `docker run` 参数：本地环境使用独立内核的 microVM，并整合网络与凭据代理；其中还能运行自己的 Docker Engine。因此容器也可以是这个产品内部使用的工具。[Docker Sandboxes 隔离机制](https://docs.docker.com/ai/sandboxes/security/isolation)

安装并初始化产品后，可创建一个命名环境、在宿主配置凭据，再启动 Agent。以下以内置 Claude kit 为例，未实测：

```sh
sbx create --name study claude
sbx secret set anthropic --sandbox study
sbx run --name study
```

`create` 创建环境，`secret set` 在宿主绑定凭据，`run` 启动其中的 Agent。随后交给 Agent 的命令会在该环境内执行：例如任务目录已有脚本、环境已安装 Python 时，让它运行 `python /work/task.py`。这个例子未共享工作区，实际文件需先交付，或创建时按产品工作区选项共享；路径以环境内实际位置为准。

- 文件：不传工作区可使用无工作区模式；共享目录会暴露其中内容。clone 模式可隔离源码修改，但只读共享仍可能暴露 `.env`，应先排除秘密。
- 网络：通过产品网络策略限制出口，不把“有代理”当成任意请求都安全。
- 凭据：第二步交互输入，真实值留在宿主；受支持服务的请求由 forward proxy 注入认证，沙箱只见占位值。自有 API 需额外声明服务域名和认证方式；OAuth passthrough 会回传真实 token，不适用此保密条件。
- 资源与回收：microVM 隔离不等于已有任务额度；按产品版本配置容量，外部执行器控制任务时间。先保存输出，再用 `sbx rm study` 删除环境，凭据记录另外管理。

用单独限额的测试凭据验证，实际 API 调用可能收费。上述行为限本地产品、支持代理托管的 kit，按 2026-10-10 文档核对。[隔离层与工作区](https://docs.docker.com/ai/sandboxes/security/isolation)、[凭据配置](https://docs.docker.com/ai/sandboxes/configuration/credentials/)
