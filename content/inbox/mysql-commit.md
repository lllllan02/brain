---
title: "MySQL COMMIT 与提交状态"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "事务"]
aliases: ["MySQL 事务提交", "COMMIT"]
---

**COMMIT 是提交事务的命令，事务是否已提交则由数据库内部的状态记录来判断。** 对普通持久表的写事务，InnoDB 会更新 Undo 等事务元数据，这些修改也受 [[mysql-redo-log|Redo Log]] 保护，供崩溃后恢复事务状态。

因此，「存在数据修改的 Redo」不等于「事务已经提交」：日志在修改数据时就会产生。默认持久化配置下，数据库先确保提交所需的日志持久化，才向客户端返回成功。

开启 [[mysql-binlog|Binlog]] 时，MySQL 通过内部两阶段提交协调两类日志；崩溃后部分事务的提交判定还需结合 Binlog，见[[mysql-crash-recovery|崩溃恢复]]。

参考：[事务提交实现](https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/trx/trx0trx.cc)、[Binlog 与事务恢复](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)。
