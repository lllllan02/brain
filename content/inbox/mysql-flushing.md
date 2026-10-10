---
title: "MySQL 刷盘机制"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "持久化"]
aliases: ["InnoDB 刷盘", "日志刷盘与数据页刷盘"]
---

**MySQL 刷盘是将内存中的日志或脏页写回存储的过程。** [[innodb|InnoDB]] 有两条写入路径：

- 日志：[[mysql-redo-log|Redo Log]] 在提交时按策略写出、持久化。
- 数据页：[[mysql-buffer-pool|Buffer Pool]] 中的脏页由后台按需写回；[[mysql-undo-log|Undo 页]]也走这条路径，受 Redo 保护，不要求提交时单独刷盘。

两者遵守 [[wal|WAL]]：**「对应 Redo 先持久化 → 数据页再写回」**，让提交不必等待数据页写回，减少随机 I/O 等待。

`innodb_flush_log_at_trx_commit` 控制 Redo 的提交策略：

| 值 | 策略 |
| --- | --- |
| `1`（默认） | COMMIT 成功返回前确保所需 Redo 持久化。 |
| `2` | 提交时写入操作系统缓存，后台通常每秒持久化。 |
| `0` | 后台通常每秒写出并持久化，提交时不要求写出。 |

**「写入缓存不等于持久化」**；每秒只是默认策略，并非严格保证，`0`、`2` 在故障时可能丢失最近事务。

参考：[InnoDB 日志缓冲区](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log-buffer.html)、[日志刷盘策略](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit)、[Buffer Pool 刷盘](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-buffer-pool-flushing.html)。
