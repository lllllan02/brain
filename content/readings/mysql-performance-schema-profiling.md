---
title: "MySQL 官方手册导读：语句、阶段与等待事件"
category: "MySQL"
parent: mysql-statement-tracing
type: "article"
tags: ["MySQL", "性能排查", "Performance Schema"]
created_at: "2026-10-12T22:06:03+08:00"
updated_at: "2026-10-12T22:20:31+08:00"
source:
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-query-profiling.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-statements-current-table.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-stages-current-table.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-waits-current-table.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-obtaining-parent-events.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-consumers-table.html"
---

本导读节选 MySQL 8.4 手册的事件剖析方法：先确定一条语句，再关联它的阶段和等待。它解释运行时耗时的组成，不替代 EXPLAIN 对访问路径的说明，也不覆盖应用取得连接前的排队。

## 官方示例怎样定位耗时

[查询剖析示例](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-query-profiling.html)先限定被监测账号，再开启语句与阶段的 instrument、计时及 consumer，执行目标查询，最后从历史表找到语句及所属阶段。示例里约 28 毫秒的语句，大部分时间落在 Opening tables 阶段；这是手册示例，不能据此归纳所有查询都慢在打开表。

该过程的关键是「先采集，再运行，再关联」。`setup_instruments` 决定哪些操作被监测及是否计时，`setup_consumers` 决定写入哪些事件表。官方示例为隔离测试账号关闭了其他账号的监测；这是示例环境的设置，实际诊断应保留已有监测，并按对象和时间窗口控制新增采集。

## 事件怎样连接起来

[语句事件表](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-statements-current-table.html)以 `(THREAD_ID, EVENT_ID)` 唯一标识事件；EVENT_ID 只在线程内解释，不能单独跨线程关联。`END_EVENT_ID` 为 NULL 表示事件未结束。`TIMER_WAIT` 是经过时间，单位为皮秒，除以 `10^12` 得秒；未启用计时时计时字段为 NULL，不能当作耗时为零。

语句、阶段与等待分别有 current、history、history_long 表。current 保存线程最近被监测事件的状态，其中可能是已结束事件；history 保存各线程最近结束的有限条目，history_long 保存实例范围内最近结束的有限条目。表名不代表无限历史档案。

[阶段事件](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-stages-current-table.html)通常嵌套在语句中，通过 `NESTING_EVENT_ID`、`NESTING_EVENT_TYPE` 指向父事件。[等待事件](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-events-waits-current-table.html)还可嵌套在阶段或其他等待中，不能把所有等待的父 ID 都当成语句 ID。等待记录中的对象、操作和时长有助于区分文件、套接字与同步操作；table handler 的 I/O 事件包含引擎访问工作，不能直接等同于物理磁盘读写。

依据嵌套关系，语句包含阶段、阶段又可能包含等待，逐层耗时不能直接相加。阶段名用于定位操作区域，仍需下一层事件解释原因。

## 历史消失后还能找到什么

[父事件说明](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/performance-schema-obtaining-parent-events.html)指出，持锁语句可能早已结束并从历史表淘汰，而事务还未结束。沿锁 → 等待 → 阶段 → 语句逐层查找时，中间记录可能已消失。

手册因此使用同线程的事件编号区间寻找仍存活的上层事务：父事件开始编号小于子事件编号，子编号不超过父事件结束编号；父事件尚未结束时，结束编号为 NULL。这个方法不要求所有中间事件仍在，却不能恢复已经淘汰的 SQL 文本。

[consumer 配置](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-consumers-table.html)存在层级依赖，手册默认示例中阶段和等待 consumer 与语句 consumer 的开关并不相同。空表可能来自未采集或历史覆盖；有事件但计时字段为 NULL 时还需检查 TIMED 设置。事后开启不会补回旧事件。实际关联步骤在[[mysql-statement-tracing|语句追踪]]中使用这些规则；未在本库连接实例执行示例。
