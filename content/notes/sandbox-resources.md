---
parent: agent-sandbox
title: "沙箱如何限制资源消耗"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**资源限制防止一项任务耗尽机器资源，影响其他任务或服务。** 文件和网络权限即使正确，程序仍可能死循环、占满内存、不断创建进程或写满磁盘。

| 担心什么 | 对应限制 |
| --- | --- |
| 计算持续占满 CPU | 分配 CPU 时间额度，让任务只能使用一定计算能力 |
| 内存不断增长 | 设置内存上限；达到限制后可能分配失败或触发 OOM 终止 |
| 进程、线程不断增加 | 设置任务数量上限；只限制 Agent 会话数不够 |
| 文件、日志不断变大 | 分别设置存储配额、日志轮转和输出缓冲上限 |
| 命令迟迟不结束 | 设置运行时限，到时触发终止与清理 |

各项不能互相替代：能写哪个目录不等于能写多少，日志轮转不限制任意输出文件，超时也阻止不了短时间耗尽内存。

[[docker-sandbox-practice|Docker]]用容器参数，[[e2b-sandbox-practice|E2B]]用模板规格与生命周期参数；[[firecracker-sandbox-practice|Firecracker]]需区分客户容量和宿主实际配额，[[gvisor-sandbox-practice|gVisor]]的内外进程计数也不同。

本机 Linux 可用 systemd／cgroup 包装任务：`CPUQuota`、`MemoryMax`、`TasksMax`、`RuntimeMaxSec` 分别控制 CPU、内存、任务数和时限。需具备相应控制器授权，不能把管理接口交给任务；macOS 不直接适用。[资源设置](https://github.com/systemd/systemd/blob/main/man/systemd.resource-control.xml)

单个任务有额度后，还需用[[sandbox-concurrency|并发控制]]约束总量，超时后完成[[sandbox-processes|整组进程清理]]再释放资源。
