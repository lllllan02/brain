---
title: "Redis 持久化（Persistence）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "RDB", "AOF"]
aliases: ["Redis persistence"]
---

**Redis 把数据放在内存，进程一重启就会丢，所以需要持久化。** 两条路线：**[[redis-rdb|RDB]]** 定期把某一时刻的数据存成快照（snapshot）——文件小、恢复快，但只能恢复到最近一次快照，之后的数据会丢；**[[redis-aof|AOF]]** 把每条写操作追加成日志——丢失窗口小，但文件更大、恢复要重放命令。

选哪条、或是否混合使用，取决于可接受的丢失窗口、恢复时间，以及运行时的 I/O 和内存成本。机制依据见 [Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)。
