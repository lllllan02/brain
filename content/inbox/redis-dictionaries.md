---
title: "Redis 字典怎样把 rehash 分摊到多次操作？"
category: "Redis"
updated_at: "2026-10-07"
tags: ["dict", "rehash", "哈希表"]
---

Redis 字典在 rehash 期间保留新旧两张表，逐步搬迁旧表中的桶。这样可以减少一次性迁移大表造成的长停顿，但仍需要额外内存和迁移工作。

以下按 Redis 7.2 的实现理解：dict 保存两张桶表、各自的使用量和大小信息，以及 rehashidx 进度。原资料中的 dictht 嵌套结构属于其他版本或简化表达，不应与该版本字段混用。[dict.h](https://github.com/redis/redis/blob/7.2/src/dict.h)

桶中的冲突采用 [[hash-tables|链式处理]]。开始 rehash 后，新插入进入新表，查找与删除需要考虑两张表；迁移完成后释放旧桶表并切换角色。普通操作与周期性维护可推进迁移，具体暂停、预算与触发阈值由版本和运行状态决定。

## 渐进式是否保证每次都只花常数时间

分步迁移缩短集中停顿，不等于严格的固定耗时上限。分配新桶表、处理长冲突链以及缓存开销仍可能造成延迟。后台持久化期间还需考虑修改内存引起的写时复制成本，不能脱离版本只背一个负载阈值。

Redis 的 Hash 数据类型也不必总使用 dict。以 7.2 为例，小对象可用 listpack 等紧凑编码，超过相关大小条件后转为哈希表。类型语义、对象编码和底层容器是三层概念。

实现见 [Redis 7.2 dict.c](https://github.com/redis/redis/blob/7.2/src/dict.c)，配置边界见 [redis.conf](https://github.com/redis/redis/blob/7.2/redis.conf)。
