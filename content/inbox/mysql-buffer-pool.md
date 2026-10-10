---
title: "Buffer Pool（缓冲池）"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "缓存"]
aliases: ["InnoDB Buffer Pool", "缓冲池"]
---

**Buffer Pool 是 [[innodb|InnoDB]] 缓存磁盘页面的内存区域，通过复用页面和延迟写回减少磁盘 I/O。**

它缓存数据页、索引页、[[mysql-undo-log|Undo 页]]及部分内部管理页；其中[[mysql-clustered-index|聚簇索引]]叶子页本身就保存行数据。Redo 使用独立的 Log Buffer，[[mysql-binlog|Binlog]] 也有自己的缓存。

- 读取：先查 Buffer Pool，未命中再从磁盘加载页面。
- 修改：修改内存页，形成脏页，同时生成 [[mysql-redo-log|Redo Log]]。脏页是已修改但尚未写回的页。
- 写回：后台按需通过[[mysql-flushing|刷盘机制]]将脏页写回磁盘，不必每次修改都立即写盘。

缓存空间由改进的 LRU 策略管理，优先保留常用页，并跟踪脏页以安排写回。

参考：[InnoDB Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)、[Undo Logs](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html)。
