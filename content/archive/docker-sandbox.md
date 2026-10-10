---
title: "用 Docker 限制工具执行"
category: "Agent"
tags: ["Agent", "沙箱", "Docker"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Docker 可以把工具程序放进容器，再通过挂载、只读权限、网络规则和资源配额建立沙箱边界。** 仅启动容器并不等于这些限制已经齐备。

## 文件范围怎么限制？

假设宿主机有项目目录 `/project` 和私人目录 `/private`。下面是启动容器时的参数示例，未实际执行：

```bash
--mount type=bind,src=/project,dst=/work
```

「挂载」把宿主机的 `/project` 接到容器的 `/work`。容器里的脚本能通过 `/work` 访问项目文件；没有接入的宿主机 `/private`，不会因脚本知道路径就自动可访问。容器还会看到自身镜像里的文件，因此镜像和传入的环境变量也不能包含无关秘密。

这个挂载默认可写，修改会影响宿主机项目。若只供读取，在参数末尾加 `,readonly`；程序仍能读文件，但修改、删除会被文件系统拒绝。[Docker 挂载与只读配置](https://docs.docker.com/engine/storage/bind-mounts/)

## 网络和资源怎么限制？

以下同样是 `docker run` 的参数示例，按需要组合：

| 参数 | 执行时的效果 |
| --- | --- |
| `--network none` | 不提供通常的外部网络连接，上传到外部服务器的尝试无法建立连接 |
| `--read-only` | 容器根文件系统只读；单独挂载的可写工作目录仍按自身配置处理 |
| `--memory 512m` | 限制内存；交换空间另由 `--memory-swap` 控制 |
| `--cpus 1` | 限制 CPU 使用量，忙循环受到配额约束 |
| `--pids-limit 64` | 限制进程／线程数量，达到上限后不能继续创建 |

运行时限由外部执行器计时并终止容器；磁盘、挂载目录和日志的用量也要另外限制，不能从内存或 CPU 配额推导出来。[Docker 运行参数](https://docs.docker.com/reference/cli/docker/container/run/)、[资源配额](https://docs.docker.com/engine/containers/resource_constraints/)

Docker 将配置交给底层机制执行：[[container-images|Linux 容器]]通常通过 namespace 隔离资源视图，通过 cgroup 管理资源用量。配置不应向不可信程序开放特权模式或 Docker 管理接口，否则程序可能获得改变边界的能力。这些参数用于说明机制，并非完整的生产安全配置。
