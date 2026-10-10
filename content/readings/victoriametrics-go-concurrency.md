---
title: "VictoriaMetrics Go 并发文章总结"
category: "Go"
tags: ["Go", "并发", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这组导读围绕 Go 并发原语的内部机制，重点理解它们如何协调等待、降低竞争，以及为性能付出的代价。**

可先看锁与等待，建立对唤醒和同步的理解；再看初始化、对象复用与重复请求合并。各篇保留原文链接，源码分析按文章所述版本理解，不代表当前所有 Go 版本，也不等于本地实测。

## 锁与等待怎样配合

- [[victoriametrics-mutex-summary|Mutex]]：正常模式为何允许争抢，饥饿模式怎样照顾久等者。
- [[victoriametrics-waitgroup-summary|WaitGroup]]：计数与唤醒如何衔接，64 位状态为何需要跨平台对齐。
- [[victoriametrics-cond-summary|Cond]]：怎样避免登记后漏通知，为什么醒来仍要检查条件。

## 怎样减少重复工作与竞争

- [[victoriametrics-once-summary|Once]]：除了只执行一次，为什么还要保证完成可见性。
- [[victoriametrics-pool-summary|Pool]]：本地缓存、伪共享与 GC 淘汰如何影响对象复用。
- [[victoriametrics-sync-map-summary|sync.Map]]：旧双表怎样减少读路径锁竞争，哪些成本仍然存在；注意 Go 1.24 的实现变化。
- [[victoriametrics-singleflight-summary|singleflight]]：同 key 在途请求怎样共享结果，为什么超时与 Forget 都不等于取消共享执行。
