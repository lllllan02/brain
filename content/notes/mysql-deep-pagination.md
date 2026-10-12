---
title: "深分页优化"
category: "MySQL"
parent: mysql-index-pagination
tags: ["索引", "SQL优化", "分页"]
created_at: "2026-10-12T17:56:27+08:00"
updated_at: "2026-10-12T18:04:41+08:00"
---

**深分页是偏移量很大的分页查询。** 优化有两条路径：仍按页码访问时，降低被跳过记录的读取成本；允许连续翻页时，用键值边界消除偏移扫描。没有通用的「多少页开始算深」阈值。

## 保留页码：延迟关联

**延迟关联（Deferred Join）是先确定当前页的记录标识，再关联原表补齐所需字段的查询方式。**

假设 MySQL 8.4、InnoDB 的 orders 以 id 为主键，有索引 `(user_id, created_at, id)`，created_at 非空，amount 不在该索引中：

```sql
SELECT id, created_at, amount FROM orders
WHERE user_id = 7
ORDER BY created_at, id
LIMIT 20 OFFSET 1000000;
```

若采用二级索引顺序扫描并逐条取行，数据库会为大量最终被跳过的记录读取 amount。把分页放进只读索引列的子查询：

```sql
SELECT o.id, o.created_at, o.amount
FROM (
    SELECT id, created_at FROM orders
    WHERE user_id = 7
    ORDER BY created_at, id
    LIMIT 20 OFFSET 1000000
) AS page
JOIN orders AS o ON o.id = page.id
ORDER BY page.created_at, page.id;
```

内层通过[[mysql-covering-index|覆盖索引]]扫描约 1000020 条合格索引记录，留下 20 个 ID；外层才为这一页取 amount。它减少的是被丢弃记录的取行工作，**「没有消除百万条偏移扫描」**。原查询已经覆盖时，额外关联未必有收益；MVCC 可见性检查也使覆盖访问不能等同于物理上绝不访问聚簇记录。

[[mysql-pagination-sources#PlanetScale：延迟关联|PlanetScale 的延迟关联示例]]展示了这种改写；[[mysql-manual-queries#分页与结果读取|官方派生表规则]]说明 LIMIT 会阻止子查询被合并进外层。外层仍需明确 ORDER BY，不能依赖关联保留内层顺序。决定记录是否入选的条件必须在分页前完成；涉及一对多 JOIN 时，先确认分页对象是主记录还是连接后的结果行。

## 连续翻页：按键继续

[[mysql-index-pagination#把位置换成键值边界|游标分页]]保存上一页最后的排序键，再从该键之后定位。它省去从头数过历史结果的工作，但必须有支持范围定位与排序的索引，不能直接把页码换算为主键值。

如果每次仍用 `OFFSET 1000000` 子查询寻找起始键，只是把偏移扫描移到了子查询里。真正免除这项工作，需要已经知道边界，或提前建立位置映射。

## 快速任意跳页：预计算位置

**结果位置映射是保存「某份有序结果中的序号 → 记录 ID」的辅助数据。** 对固定结果，可建立 `(result_id, position)` 索引，通过序号范围取得一页 ID，再关联原表。[[mysql-pagination-sources#Percona：排序成本与结果位置|Percona 的分页优化讨论]]给出了预计算位置的思路。

构建映射仍需完成查询和排序，只是把成本提前，适合结果重复使用、允许快照或定期更新的场景。筛选与排序改变后不能复用旧映射；只保存 ID 也不会冻结原表字段值。动态结果若不值得预计算，可限制最大页深、要求缩小筛选范围，但这会改变产品提供的访问范围。

以上 SQL 为机制示例，未实测。用[[mysql-index-access-cost|执行计划与实际工作量]]核对内层是否覆盖、是否额外排序，以及外层是否按主键只取当前页；不要把返回 20 行当成只扫描 20 行。
