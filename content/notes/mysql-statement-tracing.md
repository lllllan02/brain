---
learning_status: pending
title: "MySQL 语句与等待追踪"
aliases: ["Performance Schema 语句剖析", "Query Profiling"]
category: "MySQL"
parent: mysql-slow-query
type: "practice"
tags: ["MySQL", "性能排查", "Performance Schema"]
created_at: "2026-10-12T22:06:03+08:00"
updated_at: "2026-10-12T22:06:03+08:00"
---

**语句追踪是按线程与事件标识，将一条 SQL 和它的执行阶段、等待记录对应起来的诊断方法。** 执行计划说明怎样取数，追踪帮助判断执行期间时间花在哪里；以下以 MySQL 8.4 为范围。

## 先找到同一次执行

同一种 SQL 在一个连接上可能执行多次。SQL 文本相同，或 THREAD_ID 相同，都不足以证明是故障时的那次执行；要同时保存发生时间、连接 ID 和 `(THREAD_ID, EVENT_ID)`。

下面假设已从应用关联到 MySQL 连接 ID 123，由另一个诊断连接查询；123 须替换为实际值：

```sql
SELECT t.PROCESSLIST_ID, s.THREAD_ID, s.EVENT_ID, s.END_EVENT_ID,
       s.SQL_TEXT, s.TIMER_WAIT / 1000000000000 AS elapsed_seconds,
       s.ROWS_EXAMINED, s.ROWS_SENT
FROM performance_schema.threads AS t
JOIN performance_schema.events_statements_current AS s
  ON s.THREAD_ID = t.THREAD_ID
WHERE t.PROCESSLIST_ID = 123;
```

PROCESSLIST_ID 是连接 ID，与 Performance Schema 的 THREAD_ID 不同。current 表保存最近被监测语句的状态；**「END_EVENT_ID 为 NULL」**才说明该事件尚未结束。已结束语句须结合 history 或 history_long 的保留记录，不能把当前查到的另一条语句当成原请求。

## 从阶段继续追到等待

假设上一步得到 THREAD_ID=42、EVENT_ID=105，且该语句已结束、阶段历史已采集，可查它的直接阶段：

```sql
SELECT EVENT_ID, EVENT_NAME,
       TIMER_WAIT / 1000000000000 AS elapsed_seconds
FROM performance_schema.events_stages_history_long
WHERE THREAD_ID = 42
  AND NESTING_EVENT_TYPE = 'STATEMENT'
  AND NESTING_EVENT_ID = 105
ORDER BY EVENT_ID;
```

某阶段耗时高时，再按同一线程与该阶段 EVENT_ID 查询等待历史，并核对等待记录的 `NESTING_EVENT_TYPE='STAGE'`。有些等待直接属于语句或嵌套在其他等待中，应沿实际父类型继续关联；不能统一用语句 ID 去匹配所有等待。

文件 read/write、套接字操作与同步等待需要分别解释。table handler 的 I/O 事件还可能包含缓存访问和引擎处理，不能只凭 I/O 名称认定读了磁盘。语句包含阶段和等待，父子计时会重叠，不能逐层相加；没有采集到的部分也不能直接当成 CPU 时间。对应语义见[[mysql-performance-schema-profiling|官方事件剖析导读]]。

## 查不到时保留什么判断

先核对 instrument 是否启用、是否计时，以及 consumer 和线程历史采集是否开启；再核对历史容量、执行时间和事件标识。等待、阶段记录可能比语句更早被覆盖，空表不能证明从未等待。

若持锁语句已结束而事务仍存活，原 SQL 可能已不可恢复，仍可从现存锁和事务查[[mysql-lock-waits|阻塞关系]]。发现采集不足时，为下次发生保留采样条件；事后开启不能补回旧事件。以上 SQL 是按手册字段组织的只读示例，未连接实例执行。
