---
title: "MySQL 官方手册导读：内部临时表的存储与监测"
category: "MySQL"
parent: mysql-query-resources
type: "article"
tags: ["MySQL", "SQL优化", "性能排查"]
created_at: "2026-10-12T22:06:03+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/internal-temporary-tables.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/server-system-variables.html#sysvar_tmp_table_size"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/server-system-variables.html#sysvar_temptable_max_ram"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/server-system-variables.html#sysvar_temptable_max_mmap"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-statements-current-table.html"
---

本导读节选 MySQL 8.4 内部临时表的存储限制和诊断口径。它们是执行语句时由服务器建立的中间存储，与应用显式 CREATE TEMPORARY TABLE 不同；派生结果为什么需要保存、何时能够合并，另由[[mysql-derived-optimization|派生表与物化导读]]解释。

## 中间结果何时用到磁盘

[内部临时表说明](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/internal-temporary-tables.html)列举物化、部分聚合、去重与窗口处理等场景。`Using temporary` 能提示某些临时表，但不覆盖全部派生或物化结果；出现标记也不说明一定写盘。

默认内存引擎 **「TempTable 与可选 MEMORY 的限制不同」**，不能混用配置公式：

| 路径 | 主要限制与变化 |
| --- | --- |
| TempTable 单个内存临时表 | 达到 `tmp_table_size` 后转为 InnoDB 磁盘临时表 |
| TempTable 全局内存预算 | `temptable_max_ram` 限制共享 RAM 预算，超出后按配置使用内存映射文件或 InnoDB 磁盘临时表 |
| MEMORY 内部临时表 | 内存上限取 `tmp_table_size` 与 `max_heap_table_size` 较小值，过大时转换为磁盘临时表 |

[变量说明](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/server-system-variables.html#sysvar_temptable_max_ram)给出 8.4 的 TempTable RAM 默认预算为服务器内存的 3%，默认范围限制在 1–4 GiB；该预算不包含各线程的本地内存块。它不是单条查询独享的内存。

[内存映射配置](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/server-system-variables.html#sysvar_temptable_max_mmap)在 8.4 默认 `temptable_max_mmap=0`，`temptable_use_mmap=OFF`；前者为零即禁用映射文件分配。内部临时表章节监测段仍保留「默认溢出使用 mmap」的概括，与同页配置段和变量说明不一致；8.4 的默认值采用变量说明，实例诊断核对实际配置。

## 计数为什么可能漏掉磁盘使用

[内部临时表的监测段](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/internal-temporary-tables.html)说明，`Created_tmp_tables` 记录内部临时表创建，`Created_tmp_disk_tables` 不包含 TempTable 通过内存映射文件使用的磁盘空间。启用该路径时，需结合 `memory/temptable/physical_disk` 等 instrument；不能由磁盘临时表计数为零推断没有任何临时存储 I/O。

[语句事件字段](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-statements-current-table.html)提供语句级临时表数量、排序行数与归并次数，能缩小观察对象；**「累计全局计数则须对齐窗口和流量」**。自己的[[mysql-query-resources|查询资源排查]]结合这些信号判断输入量、内存与存储压力；本导读未压测或调整参数。
