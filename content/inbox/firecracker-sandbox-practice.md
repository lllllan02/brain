---
parent: sandbox-implementations
title: "Firecracker 沙箱的大致用法"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Firecracker 创建轻量虚拟机（microVM），让任务运行在自己的客户内核里。** 它借助 Linux 的 KVM 提供虚拟 CPU、内存和设备；相比共享宿主内核的普通容器，这里多了一套独立运行的客户系统。

因此使用时要准备客户内核、磁盘镜像和外部管理器，不能只指定宿主目录就开始运行；需要支持 KVM 的 Linux 环境。

先在宿主准备好 `vm.json`（内核、磁盘、资源与设备配置），以及含 Python、依赖和 `task.py` 的客户磁盘。调用分两步，示例未实测：

```sh
# 宿主：启动虚拟机，socket 路径需未被占用
firecracker --api-sock ./firecracker.socket --config-file ./vm.json
```

```sh
# 客户系统内：通过已配置的串口登录，或由客户内的任务服务执行
python /work/task.py
```

Firecracker 的启动命令负责开机，不会直接替你执行宿主的 Python 文件；代码交付和客户内执行通道需要事先准备。

| 内容 | 大致怎么做 |
| --- | --- |
| 文件 | 任务输入制成只读数据盘，输出使用每任务独立可写盘或受控通信；宿主目录不会自动出现在客户系统 |
| 网络 | 不配置网卡即可没有外部网络接口；联网用 TAP，宿主防火墙限定目标，需要域名规则时接出口代理 |
| 凭据 | 不把密钥放入根镜像、数据盘、快照或启动参数；认证由虚拟机外代理完成，管理 API socket 不交给任务 |
| 资源 | `vcpu_count`、`mem_size_mib` 决定客户容量；jailer／宿主 cgroup 再限制实际消耗，客户进程数量需在客户内部管理 |
| 回收 | 外部管理器负责超时、停止实例、保存输出并清理磁盘和网络资源 |

vCPU 数不等于宿主 CPU 时间配额，宿主内存还需容纳运行时开销；磁盘容量与设备吞吐可分别设置。客户有 root 权限时能改自己的路由，因此不能只靠“不设置默认路由”限制访问。实际服务还需用 jailer 约束宿主侧进程，启动成功不等于生产隔离完成。

[启动配置](https://github.com/firecracker-microvm/firecracker/blob/main/docs/getting-started.md)、[网络](https://github.com/firecracker-microvm/firecracker/blob/main/docs/network-setup.md)、[jailer](https://github.com/firecracker-microvm/firecracker/blob/main/docs/jailer.md)。本篇为使用概览，未部署验证。
