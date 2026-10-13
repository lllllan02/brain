---
title: "Redis 官方文档与源码：数据类型和编码"
category: "Redis"
tags: ["Redis", "数据结构"]
source:
  - "https://redis.io/docs/latest/develop/data-types/"
  - "https://redis.io/docs/latest/commands/object-encoding/"
  - "https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/"
  - "https://github.com/redis/redis/tree/7.2.5/src"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

本导读选取 API 类型与内存编码之间的关系，源码定位固定到 Redis 7.2.5；官方 `latest` 页面会继续变化，不能将其中新增类型或命令都视为旧版本能力。

## API 与编码的两层含义

[数据类型目录](https://redis.io/docs/latest/develop/data-types/)按可执行操作区分字符串、字段映射、列表、集合、有序集合与事件流，也列出 Bitmap、HyperLogLog 和 GEO 等能力。它支持按需求找 API，但内部对象类型与这些功能分类并非一一对应。

[OBJECT ENCODING](https://redis.io/docs/latest/commands/object-encoding//)展示**「同一类型可用不同编码」**：小 Hash/ZSet 可用 listpack，普通 Hash 用哈希表，普通 ZSet 用 skiplist 编码；Set 的 listpack 支持标注为 7.2 起。API 不变，内存表示可以随内容与规模转换。

[内存优化说明](https://redis.io/docs/latest/management/optimization/memory-optimization/)把小对象编码解释为 **「CPU 与内存的交换」**：紧凑布局减少对象开销，但查找和更新可能增加扫描、搬移。阈值受元素数、元素大小及配置影响。文档中的节省比例是特定条件下的观察，不能代替目标业务的测量。

## 从实现看结构为何这样组合

[sds.h](https://github.com/redis/redis/blob/7.2.5/src/sds.h)的头部保存长度，常用布局还保存分配容量，`sdslen` 直接读取长度。这样可以携带任意字节内容，并区分已用空间与预留容量；容量管理的收益不能推导出所有追加都不需要分配。

[dict.c](https://github.com/redis/redis/blob/7.2.5/src/dict.c)在扩容时建立第二张表并记录迁移位置；`dictRehash` 按桶转移条目，完成后替换旧表，普通查找与更新可推动迁移。源码支持「分摊迁移工作」的解释，不能据此声称不存在任何长尾停顿。

[t_list.c](https://github.com/redis/redis/blob/7.2.5/src/t_list.c)分别处理 listpack 与 quicklist 编码，并包含两者转换的条件；[listpack.c](https://github.com/redis/redis/blob/7.2.5/src/listpack.c)处理紧凑条目编码。listpack 的尾部反向长度描述本条目，插入或删除不会要求后续每项重写前项长度；连续布局仍可能发生内存搬移。

[t_zset.c](https://github.com/redis/redis/blob/7.2.5/src/t_zset.c)开头说明一般 ZSet 编码组合字典和跳表。两者共享成员字符串：字典便于按成员定位，跳表维护分数顺序；`zslInsert` 维护 forward 指针与 span，后者支持排名定位。相同分数时再按成员比较，业务若需要另一种同分顺序，必须明确表达。

字段过期也要单独核对：[HEXPIRE](https://redis.io/docs/latest/commands/hexpire//)标注从 7.4.0 开始提供。以上为文档与源码阅读，未执行编码转换或性能实验。
