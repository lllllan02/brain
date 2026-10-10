---
parent: sandbox-implementations
title: "用普通 Docker 容器运行任务"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Docker 根据镜像启动一组隔离的进程，通过挂载、网络和资源参数形成容器边界。** 普通 Linux 容器仍共享宿主内核：命名空间分开文件挂载、网络等视图，cgroup 管资源额度；不是给每个容器启动独立内核。

[[container-images|镜像]]提供工具和依赖，任务目录再按需挂入，适合重复创建相同执行环境。

准备包含 Python 和依赖的镜像，在只放任务文件的目录执行。以下使用示例镜像，未实测：

```sh
docker run --rm --network none --read-only \
  --cap-drop ALL --security-opt no-new-privileges=true \
  --mount "type=bind,src=$PWD,dst=/work,readonly" --workdir /work \
  --tmpfs /tmp:rw,nosuid,nodev,size=64m \
  python:3.12-slim python task.py
```

`docker run` 创建容器，挂载把当前目录放到容器的 `/work`，最后的 `python task.py` 在容器内执行。示例只读挂入代码；任务要保存结果时，再挂一个单独的可写输出目录。参数不能放在镜像名之后冒充 Docker 选项。

- 文件：输入只读、需要时另设可写输出；可写挂载会修改宿主文件。Desktop 需允许共享目录，实际任务还要按宿主权限配置运行用户。
- 网络：`--network none` 禁外网；容器互访可用 `--internal` 网络。只允许特定域名需另接受控代理并限制直连，不发布端口不能阻止出站。
- 凭据：不挂用户主目录、`.env` 或 Docker socket；不把真实 key 放进 `--env`。只读秘密仍然可读，需要认证时接沙箱外代理。
- 限额与回收：内存、CPU、进程用 `--memory`、`--cpus`、`--pids-limit` 分别设置，线程也计入 pids；日志轮转不限制任意文件，磁盘配额和任务超时另管。`--rm` 删除容器，但挂载输出保留。

[[docker-sandboxes-practice|Docker Sandboxes]]另有集成代理的产品用法，不能直接套用本篇参数。[运行与挂载](https://docs.docker.com/reference/cli/docker/container/run/)、[资源限制](https://docs.docker.com/engine/containers/resource_constraints/)、[内部网络](https://docs.docker.com/reference/compose-file/networks/#internal)。
