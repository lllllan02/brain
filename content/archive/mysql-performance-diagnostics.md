---
title: "MySQL 官方手册导读：慢查询与等待"
category: "MySQL"
parent: mysql-overview#查询与性能
type: "article"
tags: ["MySQL", "SQL优化", "性能排查", "Performance Schema"]
created_at: "2026-10-12T21:32:44+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-schema.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-schema-views.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-statement-digests.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/sys-statement-analysis.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-innodb-lock-waits.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-information-schema-examples.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/sys-schema-table-lock-waits.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-io-global-by-file-by-latency.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-setup-consumers-table.html"
---

本导读节选 MySQL 8.4 手册中慢日志、语句汇总和等待观察的规则。慢日志帮助找到满足记录条件的语句，Performance Schema 提供运行事件与统计，sys Schema 提供便于诊断的视图；三者不能互相替代，也不覆盖应用端的全部耗时。

## 慢日志记录了什么

[Slow Query Log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)默认关闭，普通记录条件涉及 `long_query_time` 和 `min_examined_row_limit`。还应检查 `slow_query_log`、`log_output` 与输出位置：即使开启日志，`log_output=NONE` 也不会留下查询记录；文件输出需要选择 FILE。

文件条目中的 `Query_time` 是语句执行秒数，`Lock_time` 是获取锁的秒数，`Rows_sent` 是发给客户端的行数，**「`Rows_examined` 只计 Server 层检查的行」**，不包含存储引擎内部全部处理。因此不能直接把 examined 当成读页数或磁盘 I/O 次数。

手册明确：取得初始锁的时间不计入用于慢日志判断的执行时间，语句在执行完成、释放锁后才写入，日志顺序可能不同于开始执行顺序。由此不能用「尚无慢日志」排除一个仍在等待的请求，也不能把 Lock_time 当作所有类型等待的完整分解。

`log_queries_not_using_indexes` 可额外记录未用索引查找的查询，并受检查行数与限流等条件影响；这类记录不代表一定超过时间阈值。`log_slow_extra` 仅为 FILE 输出补充排序、临时表和读取等计数，适合为进一步分析提供线索。

## 语句指纹怎样找出累计负担

[Performance Schema](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema.html)围绕实例内的运行事件记录当前状态、历史与汇总，既可按线程，也可按文件等对象观察。[sys Schema](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-schema.html)的视图将这些数据汇总和格式化，便于调优与诊断，它不是独立采样的另一套证据。

[语句指纹](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-statement-digests.html)保留表名和结构，将字面量替换为参数标记，并去掉注释、规范空白。`user_id=7` 与 `user_id=8` 因而可以汇入同一种语句；汇总能找出重复负担，却隐藏了具体参数之间的差异，分析异常仍需取回代表性 SQL 与参数。

[statement_analysis](https://dev.mysql.com/doc/refman/8.4/en/sys-statement-analysis.html)列出规范化语句的执行次数、总耗时、最大和平均耗时，以及检查行数、返回行数等，**「默认按总耗时降序排列」**。[sys 视图格式](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-schema-views.html)说明：`x$` 版本保留原始数值，可用于排序和计算，普通版本的时间通常格式化为带单位的文本。

下面是定位高累计耗时语句的只读示例；原始计时值为皮秒，除以 `10^12` 转成秒：

```sql
SELECT db, query, exec_count,
       total_latency / 1000000000000 AS total_seconds,
       avg_latency / 1000000000000 AS avg_seconds,
       rows_examined, rows_sent
FROM sys.`x$statement_analysis`
ORDER BY total_latency DESC
LIMIT 10;
```

排序用于选择排查对象，不能把总延迟等同于 CPU 时间，也不能由高检查行数独立判定索引应怎样修改。SQL 未在本地 MySQL 实例执行。

[digest 汇总表](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)还提供 `QUERY_SAMPLE_TEXT`、样本发生时间与样本耗时，以及 `QUANTILE_95`、`QUANTILE_99`、`QUANTILE_999`。样本是该指纹的一次具体语句，未必就是业务报告的异常请求，文本还受容量限制；分位数是根据已采集直方图计算的上界估计，单位同为皮秒。它们分别帮助取回可分析的输入和观察长尾，不能用平均值代替，也不能把汇总样本当作完整请求记录。

## 锁与 I/O 应分别观察

[data_lock_waits](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html)暴露数据锁的请求者与阻塞者，包括事务、线程和锁 ID；结合 `data_locks` 可进一步找到对象与锁细节。它回答「谁等谁」，不是仅返回一项累计锁耗时。数据锁信息直接利用服务器已有数据，不依赖普通等待事件的 instrument 开关。

[sys.innodb_lock_waits](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-innodb-lock-waits.html)把当前数据锁依赖整理为等待时长、表与索引、请求连接和阻塞连接等字段；`blocking_query` 在阻塞连接空闲时可为 NULL，事务仍可能持锁。[官方事务示例](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-information-schema-examples.html)用 A 加锁后执行其他语句、B 与 C 等锁，解释「当前语句」与「取得锁的语句」为何可能不同；继续追查需关联事务与可保留的语句历史，不能只找此刻运行最久的 SQL。

[schema_table_lock_waits](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-table-lock-waits.html)则显示元数据锁阻塞，包含等待与阻塞的连接、对象和语句。表名中的 table 不代表它与 InnoDB 数据锁等待是同一类问题；例如 DDL 等待需要观察元数据锁关系。两个入口都描述当前依赖，结束后的阻塞需另靠已采集的历史证据追查。

[io_global_by_file_by_latency](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/sys-io-global-by-file-by-latency.html)按文件汇总 I/O 次数与等待时间，并区分读、写和其他操作。它用于找实例中等待较多的文件；同一文件可能被多个查询和后台任务访问，所以仅凭这张全局视图不能把 I/O 归因到某条 SQL。诊断时应对齐时间窗口，再结合线程事件和系统磁盘指标判断。

## 怎样理解汇总与采集边界

[语句汇总表](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)按 digest 等维度累计次数、计时与工作量；`FIRST_SEEN`、`LAST_SEEN` 标明这种语句首次和最近出现的时间。容量有限时，未能建立独立 digest 行的语句会进入 `DIGEST=NULL` 的汇总行，不能假定每种 SQL 都有单独记录。

比较两次采样时，应**「按同一 `(SCHEMA_NAME, DIGEST)` 的累计计数作差」**，再由 `ΔSUM_TIMER_WAIT / ΔCOUNT_STAR` 计算窗口平均耗时；计时字段须有效且增量次数大于零。不要直接相减两次累计平均值、最大值或分位数。窗口分位数需要对应窗口的直方图或请求记录；重启、统计重置或记录变化会破坏差值可比性。这是依据累计语义得到的使用方法。

[setup_consumers](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-setup-consumers-table.html)决定事件信息写到哪些目的表；手册示例中语句历史与更长历史、等待历史的默认开关不同，并存在上层采集依赖。因此排查前须核对实际启用项、计时与历史容量，空表不能单独证明没有活动；事后开启采集也不能还原之前未记录的事件。
