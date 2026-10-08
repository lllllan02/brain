---
title: "AOF 日志（Append Only File）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "AOF", "持久化"]
aliases: ["AOF", "Redis AOF", "appendonly"]
---

**AOF 是 [[redis-persistence|Redis 持久化]] 的另一条路线：把每条写命令追加到日志（append-only），重启时重放。** 它换来更小的丢失窗口，代价是文件更大、恢复要逐条重放，通常比加载 [[redis-rdb|RDB]] 慢。

- **刷盘**：`appendfsync always` 每次写都 `fsync`，最安全也最慢；`everysec` 每秒刷一次，是常见折中；`no` 交给操作系统，丢失窗口不可控。「每秒」不是所有故障和 I/O 阻塞下的严格上限——**操作系统缓存和真正落盘是两回事**。
- **重写**：日志只增不减会越来越大，`BGREWRITEAOF` 按当前数据生成更紧凑的表示，并处理重写期间的新写入；它不是简单删历史文件。
- **混合**：`aof-use-rdb-preamble` 让 AOF 文件以 RDB 开头、后面追加命令，兼顾恢复速度和丢失窗口。

重写和刷盘同样消耗磁盘与内存，不能因为开了 AOF 就忽略这些压力；文件布局与混合行为按所用版本确认。机制依据见 [Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)。
