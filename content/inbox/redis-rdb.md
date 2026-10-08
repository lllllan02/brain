---
title: "RDB 快照（Snapshot）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "RDB", "持久化"]
aliases: ["RDB", "Redis RDB", "快照持久化"]
---

**RDB 是 [[redis-persistence|Redis 持久化]] 的一条路线：把某一时刻的数据整体存成二进制快照。** 它为备份和快速整体恢复服务——文件小、加载快，代价是**从最近一次快照到故障之间的写入会丢**。

- **触发**：按 `save` 配置自动触发（如「900 秒内至少 1 次改动」），也可手动 `BGSAVE`，主从复制时也可能生成。
- **生成**：`BGSAVE` fork 子进程写临时文件，完成后原子改名；父进程继续服务，两个进程靠写时复制（copy-on-write）共享内存页。
- **代价**：fork 本身有停顿；快照期间写入越多，写时复制要复制的页越多，延迟和额外内存也越大。

所以 RDB 适合可接受一定丢失窗口的备份与迁移；要更小的丢失窗口就配合 [[redis-aof|AOF]]。机制依据见 [Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)。
