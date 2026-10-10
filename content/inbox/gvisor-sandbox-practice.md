---
parent: sandbox-implementations
title: "gVisor 沙箱的大致用法"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**gVisor 给程序提供一个「替身内核」，减少不可信代码直接攻击宿主内核的机会。** 普通 Docker 容器虽然限制了文件、网络等资源，但程序仍直接使用共享的宿主 Linux 内核。

程序读文件、创建进程时，需要向内核发出请求，称为「系统调用」。gVisor 的应用内核先接住这些请求，自己实现其中许多功能，需要底层资源时再受限地访问宿主，并非把原请求直接转发过去。运行未知代码时，这能增加一道隔离边界，代价是部分程序不兼容、某些操作变慢。[原理概览](https://gvisor.dev/docs/)

仍然使用 `docker run`，是因为 Docker 可以更换底层运行容器的组件。`runsc` 就是 gVisor 提供的组件：Docker 管理镜像、挂载与启动命令，gVisor 为其中的程序提供隔离环境。

在受支持的 Linux 主机安装并注册 `runsc` 后，给原来的 `docker run` 增加 `--runtime=runsc`。简化示例未实测：

```sh
docker run --rm --runtime=runsc --network none --read-only \
  --mount "type=bind,src=$PWD,dst=/work,readonly" --workdir /work \
  python:3.12-slim python task.py
```

在只放任务文件的目录执行，镜像需含任务依赖。`--runtime=runsc` 选择 gVisor，Python 代码无需改写。

文件仍按输入只读、输出可写挂载；网络和凭据仍沿用[[docker-sandbox-practice|Docker 的配置方式]]。换运行时不会自动去掉挂载里的秘密，也不自动提供认证代理。

CPU／内存由宿主 cgroup 约束整个 gVisor 沙箱。内部进程与宿主 PID 不一一对应，宿主 pids 限额不能直接当作内部进程数上限。任务超时和输出回收仍由外部执行器负责。

从宿主确认实际运行时，并测试文件、网络与业务命令；成功打印文本不足以证明隔离。安装或重启 Docker 会影响已有任务。[Docker 集成](https://gvisor.dev/docs/user_guide/quick_start/docker/)、[资源模型](https://gvisor.dev/docs/architecture_guide/resources/)、[兼容性](https://gvisor.dev/docs/user_guide/compatibility/)
