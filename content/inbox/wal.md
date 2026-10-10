---
title: "WAL（预写日志）"
category: "数据存储"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["数据库", "持久化"]
aliases: ["Write-Ahead Logging", "预写日志", "日志先行"]
---

**WAL（Write-Ahead Logging，预写日志）是一种通用的数据库日志机制，要求修改后的数据页写入磁盘前，先将对应的修改日志持久化，以支持崩溃恢复。** 这里的先后指磁盘写入顺序，不要求修改内存数据前先把日志刷盘。

它让数据库可以通过日志恢复尚未写入数据文件的修改；配合提交时的日志持久化，事务不必等待所有数据页写回，有助于减少提交时的随机磁盘 I/O。

WAL 不是 MySQL 特有的技术：[[mysql-redo-log|InnoDB 的 Redo Log]]是实现 WAL 的具体日志，[[postgresql|PostgreSQL]]也有自己的 WAL 实现。

参考：[PostgreSQL：Write-Ahead Logging](https://www.postgresql.org/docs/16/wal-intro.html)。
