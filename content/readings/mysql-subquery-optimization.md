---
title: "MySQL 官方手册导读：存在性查询与子查询物化"
category: "MySQL"
parent: mysql-query-optimization
type: "article"
tags: ["MySQL", "SQL优化"]
created_at: "2026-10-12T22:02:26+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/semijoins-antijoins.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/subquery-materialization.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/subquery-optimization-with-exists.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/distinct-optimization.html"
---

**这些手册章节解释了 MySQL 8.4 怎样处理「是否存在匹配」：避免无用的重复结果、复用子查询结果，或把外层值传入内层缩小查找范围。** 节选范围是 SELECT 中的存在性判断及其执行策略，不覆盖所有标量子查询和数据修改语句优化。

## 从重复结果引出半连接

[半连接与反连接](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/semijoins-antijoins.html)先用班级与学生名单解释问题：普通 JOIN 为每名学生输出一次班级，但业务只想列出有学生的班级。先生成全部匹配再用 DISTINCT 去重，做了问题本身不需要的工作。

IN 或 EXISTS 表达「只需知道有没有匹配」，优化器在符合条件时可转换为半连接（Semijoin），**「每个匹配的外层行只保留一次」**。它可选择首次匹配后停止、按索引跳过重复值、借助临时表去重或物化等策略；半连接不保证一定使用首次匹配，也不意味着匹配表完全不用扫描。

[DISTINCT 优化](https://dev.mysql.com/doc/refman/8.4/en/distinct-optimization.html)补充了原写法的边界：`SELECT DISTINCT t1.a FROM t1, t2 WHERE t1.a=t2.a` 若先访问 t1，由于结果不使用 t2 的列，MySQL 找到首个匹配后即可停止当前这轮 t2 读取。因此，逻辑上的「连接后去重」不代表执行时一定生成全部组合，换成 EXISTS 也不保证减少实际工作。

适用形态包括 WHERE 或 ON 顶层、可作为 AND 项的 IN／EXISTS；子查询须为单个 SELECT，不能有聚合函数、HAVING、LIMIT 等，另受连接数量及 STRAIGHT_JOIN 限制。简单等值相关条件也可能被去相关。因此，「相关子查询」不能仅凭 SQL 外观就判定为每行完整重算；在 EXISTS 中随手加 LIMIT 1，反而会使它不满足这里的转换条件。

NOT EXISTS 等否定形式可在适用条件下转换为反连接（Antijoin），找到匹配即可排除外层行。可空比较表达式通常限制反连接转换。计划可结合 FirstMatch、LooseScan、临时去重标记及物化节点识别，不只查看是否存在 SUBQUERY 字样。

## 物化怎样减少重复工作

[子查询物化](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/subquery-materialization.html)用不依赖外表的 IN 子查询说明另一种取舍：首次需要结果时建立临时表，后续复用；去重及可能建立的哈希索引使集合更小、查找更便宜。没有物化时，优化器也可能把它改成向内层传入外层值的 EXISTS 查询。

两条路径分别付出**「先构建结果再查找」**与**「按外层值多次查找」**的成本。物化可避免重复求整个内层结果，但需支付生成和保存成本，结果过大还可能使用磁盘。适用性受 materialization 开关、内外表达式类型、可空性与 UNKNOWN／FALSE 是否可等同处理等约束；内层 BLOB 表达式不支持这里的物化。不能把它推广为所有子查询都只执行一次。

## NULL 为什么会改变改写边界

[EXISTS 执行策略](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/subquery-optimization-with-exists.html)解释了 IN 到 EXISTS 的转换：将外层值与内层值的等式加入子查询，只检查可能相等的候选。若两侧非空，或所在过滤语境无需区分 UNKNOWN 与 FALSE，这种处理更容易成立。

如果没有相等项而内层含 NULL，IN 的结果可能是 UNKNOWN；若必须保留这一差异，就还要检查 NULL。外层本身为 NULL 时，甚至需要区分内层为空与非空，不能一律用等值索引查找替代。手册据此解释 ref_or_null 和 Full scan on NULL key 等计划现象。

由这些规则可推得：**「NOT IN 与 NOT EXISTS 不能忽略 NULL 差异而直接互换」**。例如内层只有 1 和 NULL，外层值 7 的 NOT IN 结果为 UNKNOWN，WHERE 不保留它；NOT EXISTS 的等值条件找不到 7，因而保留它。列确实不允许空值时声明 NOT NULL，有助于表达业务约束并简化优化；不能只为获得某种计划而删掉合法空值。[[mysql-existence-queries|存在性查询优化]]以正向 EXISTS 说明改写与验证；否定形式还需核对上述语义。这些手册章节不是本地性能实验。
