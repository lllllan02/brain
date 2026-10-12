---
title: "Redo Log（重做日志）"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "事务", "持久化"]
aliases: ["Redo Log", "重做日志", "InnoDB Redo Log"]
---

**Redo Log（重做日志）是 [[innodb|InnoDB]] 记录数据页修改的日志，用于崩溃后重做修改，保障事务持久性。** 它让提交不必等待数据页全部写回磁盘，减少提交时的随机 I/O 开销。

- 产生：修改内存数据页时生成，先写入 Log Buffer（日志缓冲区）。
- 持久化：默认 `innodb_flush_log_at_trx_commit=1` 时，在 COMMIT 成功返回前确保所需日志已持久化；其他策略见 [[mysql-flushing|刷盘机制]]。
- 使用：[[mysql-crash-recovery|崩溃恢复]]时重做尚未写入数据文件的修改。

默认配置下：**「发起 [[mysql-commit|COMMIT]] → 确保所需 Redo 持久化 → 返回提交成功」**。数据页可稍后写回，但必须遵守 [[wal|WAL]]：对应日志先持久化，数据页再落盘。

参考：[MySQL Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)、[Redo 与 WAL](https://dev.mysql.com/doc/dev/mysql-server/latest/PAGE_INNODB_REDO_LOG.html)。
