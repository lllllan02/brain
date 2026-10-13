---
title: "Redis 官方文档：持久化、复制与写入确认"
category: "Redis"
tags: ["Redis", "持久化", "复制"]
source:
  - "https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/"
  - "https://redis.io/docs/latest/commands/bgsave/"
  - "https://redis.io/docs/latest/commands/bgrewriteaof/"
  - "https://redis.io/docs/latest/operate/oss_and_stack/management/replication/"
  - "https://redis.io/docs/latest/commands/wait/"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

这些资料分别回答「本机能恢复什么」与「副本收到什么」。本导读选取恢复与确认边界，不将两个机制合称为不丢数据保证。

## 快照、日志与刷盘

[BGSAVE](https://redis.io/docs/latest/commands/bgsave/)说明后台生成快照的请求与执行条件；**「后台请求成功不等于最终文件已生成」**，应检查持久化状态。[BGREWRITEAOF](https://redis.io/docs/latest/commands/bgrewriteaof/)从当前数据构造恢复表示，重写完成后的文件仍能重建数据，避免无止境保留同一对象的全部修改过程。

[持久化说明](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)介绍 Redis 7 起的 base、incremental 与 manifest：重写生成新 base，父进程记录增量，再切换有效文件清单。基础文件可用 RDB 格式；这是压缩恢复工作与持续接收新写入的组合。

刷盘策略决定确认与磁盘同步的距离。[7.2.5 配置](https://github.com/redis/redis/blob/7.2.5/redis.conf)还说明 `no-appendfsync-on-rewrite` 会在后台保存期间放宽刷盘，说明不能仅凭 `everysec` 推断所有配置下的严格一秒界限。[延迟文档](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)分别讨论 fork 页表复制与 write/fsync 阻塞，后台工作仍可能影响主线程与内存。

## 复制与确认

[Replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)用复制标识、偏移量和 backlog 判断能否补发断线期间的历史；不满足条件就全量同步，再追上新变化。副本允许读扩展，但可能落后；无持久化的主节点自动重启为空库，还可能将空状态传播到副本，文档用此说明配置组合的重要性。

[WAIT](https://redis.io/docs/latest/commands/wait/)针对当前连接此前产生的写入偏移量等待副本确认，并返回实际达到的数量。超时返回也要检查数量，已执行写入不会被撤销；连接池使用时还必须保证写入与 WAIT 的连接语义正确。副本确认并不等于一个强一致选主与提交协议，文档明确保留切换后丢写的可能。

由此可推得，备份恢复、主从复制和业务重试要分别验收；误删在副本上迅速出现，正说明**「复制不能替代有历史保留的备份」**。以上未包含故障注入实测。
