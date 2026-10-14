---
learning_status: understood
title: "工具调度的最小实现"
parent: tool-scheduling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-12T13:00:57+08:00"
reading_suggestions:
  - tool-registry
  - sandbox-concurrency
  - pydantic-tool-execution-summary
  - llmcompiler-summary
  - aws-retries-summary
---

**两种调度共用依赖、资源与容量检查，区别在于完成一个调用后，能否立刻补入后续调用。** 以下是 Go 风格教学伪代码，未编译运行；辅助函数是本文约定，不是 SDK 接口。

## 共用同一组调用与执行约束

沿用总览配图，并发上限为 3，调用按 A～F 到达；计划已完整生成，调用已获批准或无需审批。

| 调用 | 操作 | 前置依赖 | 资源访问 |
| --- | --- | --- | --- |
| A | 读取配置 | 无 | 读 config.json |
| B | 生成报告 | 无 | 写 report.md |
| C | 查询订单 | 无 | 读订单服务 |
| D | 按配置计算 | A | 使用 A 的结果，无共享资源 |
| E | 追加备注 | 无 | 写 report.md |
| F | 搜索资料 | 无 | 独立查询 |

示例仅将 B、E 视为资源互斥；若业务要求「先生成、再追加」，还须给 E 声明依赖 B，不能依靠互斥保证顺序。

```text
Task(id, tool, args, depends_on)
ToolSpec(allow_concurrent, resources(args), execute)
D.args = ResultRef(A)   // 结果引用；与 depends_on=[A] 分别表达
```

工具约束由[[tool-registry|注册表]]保存，模型不能覆盖。本例允许不同资源上的写入并发；`allow_concurrent=false` 则表示当前任务内独占。程序规范化资源标识并计算读集合 R、写集合 W，两个调用重叠执行必须满足：

```text
双方都允许并发
且 t.W 与 (r.R ∪ r.W) 不相交
且 r.W 与 (t.R ∪ t.W) 不相交
```

执行前校验计划：拒绝重复 ID、未知工具、无效结果引用和依赖环；结果引用必须包含在依赖中。每次派发前先检查取消和整体期限。两种调度均按「前置成功 → 解析参数 → 校验参数与权限 → 计算资源 → 原子检查并占用名额和资源」启动调用。任务内额度还需服从[[sandbox-concurrency|环境总容量]]与剩余预算。

## 分批调度：等完本批，再启动下批

规划器或固定流程给出 `[[A,B,C], [D,E,F]]`，程序验证每批不超过容量、批内无冲突，且依赖只指向更早批次。这里展示执行已给定批次；不把每三个调用机械切成一批。

```go
for _, batch := range batches {
    // 解析结果参数并校验；整批成功占用才启动，失败不留下部分占用
    status := PrepareAndReserveBatch(batch)
    if status != Ready {
        return PauseOrFail(status) // 暂不可用则交回外层等待，拒绝则失败
    }
    for _, t := range batch {
        go Execute(t, done)       // 将成功或失败转换成完成事件
    }
    for range batch {
        event := WaitEvent(ctx, done)
        if event.IsAbort() { return CancelAndRetainUncertain() }
        RecordAndRelease(event)   // 按 ID 保存结果；确认执行结束才释放
    }
    if !AllSucceeded(batch) {
        return Replan            // 本例保守停止后续批次
    }
}
```

A 完成时虽然释放了名额，也不会启动第二批的 D：循环仍在收集当前批次的事件。这个组织方式参考 [[pydantic-tool-execution-summary|Pydantic AI 的分段执行源码]]；批次如何生成、资源检查和失败策略是本文补充的约定。

## 按就绪条件调度：完成一个，就重新派发

不预先划批；维护待执行集合 `pending`、运行集合 `running` 和结果表。`TryStart` 使用共用检查，返回已启动、暂不可用或拒绝；已启动时先登记运行状态并占用资源，再异步执行，防止后续调用重复占用。

```go
for len(pending) > 0 || len(running) > 0 {
    BlockDependentsOfFailedTasks() // 移除前置失败、未知或被阻断的依赖任务
    for _, t := range PendingInArrivalOrder() {
        if !DepsSucceeded(t) { continue }
        switch TryStart(t) {
        case Started:  RemovePending(t) // TryStart 已登记 running
        case Deferred: continue   // 资源或名额不足；仍可尝试其他调用
        case Rejected: MarkFailedAndRemove(t)
        }
    }
    BlockDependentsOfFailedTasks() // 本轮参数或权限拒绝也要传播
    if len(running) == 0 {
        return FinishOrSuspend()  // 全部终结则返回；否则记录阻塞原因
    }
    event := WaitEvent(ctx, done)  // 任一调用完成即可唤醒
    if event.IsAbort() { return CancelAndRetainUncertain() }
    RecordAndRelease(event)       // 从 running 移除，再回到顶部补位
}
```

若 A、C 完成而 B 仍运行，D 可用 A 的结果启动，F 可补入空位；E 与 B 冲突，暂不启动。[[llmcompiler-summary|LLMCompiler 源码]]提供「筛出前置已完成调用」的参考；它使用轮询，本文改用完成事件唤醒，并补上容量、资源与失败检查。

## 两段伪代码共同省略了什么？

`WaitEvent` 同时监听完成、取消和整体期限；执行期限不超过整体剩余时间。`RecordAndRelease` 保存成功、失败或结果未知，只有确认底层执行已结束才释放占用；状态未知时保留相关占用交给外层核查。中止时停止派发、请求取消，并接管尚未确认结束的调用，不能把取消当成停止或回滚。

示例采用单一调度循环，限流唤醒、动态重规划和持久恢复未展开。外部资源暂不可用时由外层等待后恢复；[[tool-permissions|审批等待]]不占执行名额或资源锁。资源声明不完整时应保守独占，任务内检查无法保护外部进程；[[aws-retries-summary|重试与重复副作用]]也需另行处理。最终按调用 ID 回传结果，不按完成顺序配对。
