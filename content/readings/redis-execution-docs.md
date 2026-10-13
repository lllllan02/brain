---
title: "Redis 官方文档：执行模型、事务与脚本"
category: "Redis"
tags: ["Redis", "事件循环", "事务", "Lua", "Pipeline"]
source:
  - "https://github.com/redis/redis/blob/7.2.5/redis.conf"
  - "https://redis.io/docs/latest/develop/using-commands/pipelining/"
  - "https://redis.io/docs/latest/develop/using-commands/transactions/"
  - "https://redis.io/docs/latest/develop/programmability/eval-intro/"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

本导读选取网络成本、命令交错与条件更新三个问题。官方资料分别描述这些保证，不能把它们合并为笼统的「批量就是原子操作」。

## 线程与网络成本

[7.2.5 配置](https://github.com/redis/redis/blob/7.2.5/redis.conf)的 `io-threads` 注释区分网络写出与可选的读取、协议解析线程；是否启用及工作分配需看具体配置。它没有将普通数据命令变为任意并行执行。[Redis 8.0 发布说明](https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.0-release-notes/)明确介绍了新的 I/O 线程实现，因此旧版线程分工与性能结论需限定版本。

[Pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/)从逐条请求等待 RTT 的成本出发：连续发送、随后读取响应，可**「减少等待轮次」**，并摊薄 read/write 系统调用。服务端需要缓存未取走的响应，所以批量须受控；无法在不知道前一条返回值时，就替客户端完成依赖该返回值的业务判断。原文基准是示例环境，不能直接作为业务收益比例。

## 事务错误发生在哪里

[Transactions](https://redis.io/docs/latest/develop/using-commands/transactions/)区分排队与执行。入队时已有命令错误会导致 EXEC 拒绝执行；EXEC 中某条运行失败时，其他命令仍可成功，系统不提供通用回滚。文档用读计数再写回展示竞争，再用 WATCH 在提交时检查 key 是否变化；冲突由应用重读重试。

## 脚本把什么移到服务端

[Lua 说明](https://redis.io/docs/latest/develop/programmability/eval-intro/)将判断与数据操作一同放到数据所在位置，减少应用往返，并使**「执行过程不被其他普通命令穿插」**。代价是脚本运行期间占用服务端执行机会，逻辑应短且有界。

Eval 脚本的缓存可能在重启、切换后缺失，客户端需能处理重新加载；Redis 7.0 起的 Functions 提供另一种服务端代码管理方式。管理方式与执行隔离是不同问题，二者都不自动提供外部数据库事务。本导读不覆盖完整函数部署和 Lua API。
