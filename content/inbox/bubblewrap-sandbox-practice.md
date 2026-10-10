---
parent: sandbox-implementations
title: "bubblewrap 沙箱的大致用法"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**bubblewrap 在启动 Linux 程序前，为它准备一套单独的资源视图。** 例如只让它看到指定的工具、输入与输出目录，并使用隔开的网络环境；底层仍是宿主 Linux 内核，没有启动另一套操作系统。

它用命名空间和挂载实现这些边界。可以直接复用本机文件，不要求 Docker 镜像，但运行库、目录和规则需自己提供；[[srt-sandbox-practice|SRT]]在 Linux 上使用它，并组织网络代理等配置。

使用时把 `bwrap` 放在任务命令之前。下面是调用结构示意，方括号需替换成实际参数，不能直接复制执行：

```text
bwrap [挂入 Python 和依赖] [挂入任务目录到 /work] 
      [网络与环境规则] --chdir /work -- python task.py
```

先准备程序可见的工具和文件，再在这套视图里运行 `python task.py`。不同系统的库路径不同，挂载缺失时 Python 也可能无法启动。各组参数的作用是：

| 要做什么 | 常用方式 |
| --- | --- |
| 提供工具和输入 | `--ro-bind` 只读挂入所需目录，不直接暴露整个宿主根目录 |
| 保存输出 | `--bind` 提供任务专属可写目录；`--tmpfs /tmp` 提供临时空间 |
| 禁止外网 | `--unshare-net`，或包含网络隔离的 `--unshare-all` |
| 清理凭据 | `--clearenv` 后逐个添加必要变量；敏感文件不挂入 |
| 跟随任务退出 | `--die-with-parent` 辅助清理，仍需外部执行器管理完整任务 |

使用前需安装 bubblewrap，并确认系统允许所需用户命名空间；不同发行版的工具和动态库路径不同。需要联网时，可选[[srt-sandbox-practice|srt]]组织出口代理，避免自行搭桥接。

CPU、内存和进程数不是挂载规则的作用，可在外层用[[sandbox-resources|systemd／cgroup 配额]]；seccomp 也需按任务单独配置。结束后保留必要输出并清理任务目录。[官方参数](https://github.com/containers/bubblewrap/blob/main/bwrap.xml)
