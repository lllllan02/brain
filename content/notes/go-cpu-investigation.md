---
title: "Go 服务 CPU 排查"
category: "性能排查"
updated_at: "2026-10-08"
tags: ["Go", "pprof", "CPU"]
type: "practice"
---

**CPU 高时先把消耗来源分清楚——业务计算、运行时还是系统调用，再用采样把进程级现象落到具体调用路径。** CPU profile 记录的是运行时间分布，解释不了阻塞等待。

先看节点与容器的 CPU 使用、配额和 throttling，再定位到具体进程。容器可能已经用满自己的配额，而宿主机总体仍很空闲。结合流量和错误率判断：是请求变多、单请求成本变高，还是重试或后台任务放大了工作量。

以下命令只是「已启用受控 pprof 端点」时的采样示例，未在目标服务执行：

```sh
go tool pprof -http=127.0.0.1:8081 'http://127.0.0.1:6060/debug/pprof/profile?seconds=30'
```

`flat` 是函数自身的采样占用，`cum` 还包含它调用的下层函数。要沿调用链找业务入口，不能只看到编码、内存分配或 GC 函数就把责任推给运行时。比较同类流量下的前后采样，更容易发现新增成本。

大量短命对象可能让 [[go-gc-latency|GC 与 mark assist]] 占用升高。`allocs` 更适合看累计分配，`heap` 关注保留对象，两者不能混用。CPU 不高但请求很慢时，转向 goroutine、mutex 或 block profile；锁与阻塞采样可能需要显式启用，并控制开销。

采样端点包含运行信息，要限制访问；别在故障高峰同时开多个重型采集，也不要把未经对照的单次热点比例当成稳定容量结论。[Go Diagnostics](https://go.dev/doc/diagnostics) 说明了各类诊断工具的适用范围。
