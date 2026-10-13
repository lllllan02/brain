---
title: "Redis Go 项目导读：go-redis 与 Asynq"
category: "Redis"
tags: ["Redis", "Go", "消息队列"]
source:
  - "https://github.com/redis/go-redis"
  - "https://github.com/hibiken/asynq"
  - "https://github.com/hibiken/asynq/blob/v0.25.1/internal/rdb/rdb.go"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T11:03:37+08:00"
---

go-redis 是 Redis 客户端，Asynq 是建立在 Redis 上的任务框架，二者层次不同，可以组合使用。以下以维护方 README 和固定源码为依据，不将仓库功能声明当作本地实测。

## go-redis 的客户端职责

[go-redis](https://github.com/redis/go-redis)提供 Go v9 模块，覆盖连接池、流水线、事务、脚本，以及 Sentinel、Cluster 连接方式。README 的基本示例通过 Client 发出命令并检查结果，展示的是应用与 Redis 之间的调用层。

这个层次适合研究连接等待、超时、重试与路由：同一条业务请求可能经历本地等待和服务端重定向，不能把应用计时全部归为 Redis 执行。README 没有为任意业务操作承诺安全重试；会修改状态的命令仍需应用判断幂等性。当前主分支能力与默认值会变化，实际接入应固定模块版本再检查配置。

## Asynq 的任务状态

[Asynq README](https://github.com/hibiken/asynq)描述 Client 入队、Server 领取后交给工作 goroutine，以及失败重试、延迟任务、崩溃恢复等能力。它声明至少一次执行，并明确提醒部分 Lua 脚本可能与 Redis Cluster 不兼容；这两项都应进入项目选型条件。

在 [v0.25.1 的 rdb.go](https://github.com/hibiken/asynq/blob/v0.25.1/internal/rdb/rdb.go)中，`dequeueCmd` 先检查暂停标记，再将任务 ID 从 pending List 转到 active List，更新任务 Hash 状态，并将租约到期时间放入 ZSet。这些配套修改放进同一个 Lua 脚本，避免只移走任务却没有记录处理状态。

`forwardCmd` 从延迟或重试 ZSet 中取到期任务，移入待处理状态，并限制单次处理数量以约束脚本运行时间；`doneCmd` 清理 active、lease 与任务记录，再更新统计。该版本由多种数据结构配合表达任务生命周期，不能将它概括为「用 Stream 做队列」。

这些代码保护 Redis 内的状态转换。实际发券、发邮件或更新外部数据库发生在处理函数中，和标记完成不共享事务；因此执行后崩溃仍需业务幂等。有限期的入队去重也不能等同于永久的业务去重。

可用来检验理解的问题是：领取后崩溃靠哪个状态发现？延迟任务怎样进入可消费队列？脚本为什么限制每批工作量？多 key 共置和框架 Cluster 兼容性还差哪些条件？这里给出源码定位与问题，未安装依赖、运行任务或完成性能评估。
