---
title: "Undo Log（回滚日志）"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "事务"]
aliases: ["Undo Log", "回滚日志", "InnoDB Undo Log"]
---

**Undo Log（回滚日志）是 MySQL InnoDB 在修改数据时保存的撤销信息，用于事务回滚，也用于构建历史版本，支持[[mysql-mvcc|多版本并发控制（MVCC）]]。**

它记录的是撤销修改所需的逻辑信息，例如 UPDATE 修改前的字段值、INSERT 新增记录的标识，而不是简单保存一条反向 SQL。这些记录存放在 Undo 页中，由 [[mysql-buffer-pool|Buffer Pool]] 缓存。

生命周期可以简记为：**「修改前准备撤销信息 → 写入内存 Undo 页 → 保留供回滚或历史读取 → 满足条件后回收或复用」**。期间 Undo 页由后台按需刷盘，与事务提交没有固定先后关系；普通持久表的 Undo 页修改也会产生 [[mysql-redo-log|Redo Log]]，因此不需要每生成一条 Undo 就立即刷盘。

**「可以回收」意味着既不再需要用于回滚，也不再需要用于 MVCC 历史读取。**

- 回滚完成后，相应撤销信息不再用于本事务回滚，可以回收；不是发起回滚就立即删除。
- 提交后，INSERT Undo 通常可以释放；UPDATE、DELETE 的 Undo 若仍可能被活跃读视图用于历史读取，就必须保留，直到满足条件后由 Purge（清理机制）处理。

例如，事务 A 将 `x=10` 改为 `x=20` 并提交，但事务 B 的快照仍需读取 `x=10`，相关 Undo 就不能清理。满足回收条件也不意味着文件立即缩小，空间可以留待复用。

Undo 通过撤销修改支撑[[transaction|事务原子性]]，Redo 通过重做修改支撑持久性。发生[[mysql-crash-recovery|崩溃]]时，还需 Redo 恢复必要的数据页和 Undo 信息，再完成应执行的回滚。

参考：[InnoDB Undo Logs](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html)、[InnoDB 多版本机制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)、[Redo 实现说明](https://dev.mysql.com/doc/dev/mysql-server/latest/PAGE_INNODB_REDO_LOG.html)。
