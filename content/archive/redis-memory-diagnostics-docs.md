---
title: "Redis 官方文档：过期、淘汰与延迟诊断"
category: "Redis"
tags: ["Redis", "TTL", "内存淘汰", "排查"]
source:
  - "https://redis.io/docs/latest/commands/expire/"
  - "https://redis.io/docs/latest/develop/reference/eviction/"
  - "https://redis.io/docs/latest/commands/slowlog/"
  - "https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/"
  - "https://redis.io/docs/latest/commands/scan/"
  - "https://redis.io/docs/latest/commands/unlink/"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

本导读选取会影响缓存容量与请求延迟的机制。命令可用性、字段名称和配置默认值仍需以目标版本为准。

## 过期与内存口径

[EXPIRE](https://redis.io/docs/latest/commands/expire/)说明被动检查与主动抽查共同处理过期数据：访问触发的检查无法清理永远无人再读的对象，所以仍需后台周期工作。过期时间是绝对时间信息，停机期间时间也继续流逝。`SET` 覆盖与 `HSET` 等内部修改对 key TTL 的影响不同，不能把所有写操作视为刷新 TTL。

[Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)区分候选集合与选择算法，并说明 LRU 通过抽样及候选池近似实现；维护精确顺序会增加成本。`volatile-*` 没有合适候选时可能拒写，`noeviction` 也不保证无限接收新数据。本文只取 7.2 常见策略，不将当前页面所有新增策略列入旧版本范围。

文档解释复制与 AOF 缓冲为何不全部计入淘汰比较：淘汰会生成新的传播记录，若把这种缓冲全计入，可能出现回收又触发更多回收的反馈。容量计划因此要留余量。分配器保留已释放内存还会使 RSS 高于实际数据占用。

## 每种指标实际观察什么

[SLOWLOG](https://redis.io/docs/latest/commands/slowlog/)**「只统计命令执行，不包含与客户端通信的 I/O」**。慢日志为空可能来自阈值、记录窗口或耗时发生在执行以外，不能据此排除所有服务端问题。

[延迟诊断](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)分别讨论环境调度基线、慢操作、fork、交换和 AOF I/O。它建议将应用端测量与内部延迟事件结合；不同观察点回答不同问题。文中的旧硬件数值与过期循环具体参数不应直接套用于当前部署。

## 观察动作也会消耗资源

[SCAN](https://redis.io/docs/latest/commands/scan/)保证完整迭代覆盖始终存在的元素，但**「可能重复返回」**；迭代中变化的元素是否被返回不确定。COUNT 是工作量提示，不能当成精确页长，因此需要游标、去重或幂等处理，并限制扫描速度。

[UNLINK](https://redis.io/docs/latest/commands/unlink/)将**「键空间摘除与内存回收分开」**，后者交给其他线程。它可减轻大对象同步释放的阻塞，却不会消除回收 CPU、等待期间的内存占用或之前已经发生的大响应传输。
