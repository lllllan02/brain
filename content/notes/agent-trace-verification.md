---
learning_status: pending
parent: agent-trace
title: "Agent Trace 的采集可靠性"
category: "Agent"
tags: ["Agent", "Trace", "可观测性", "采样"]
created_at: "2026-10-13T01:24:08+08:00"
updated_at: "2026-10-13T01:35:20+08:00"
---

**可靠性要分层验证：执行是否被记录、记录是否完整导出、平台是否正确接收，以及业务结果是否正确。** 界面上出现一棵树，只证明其中一部分数据可见。

下面对应 `labs/agent-trace/` 的 `telemetry.go`、`lab_test.go` 和 `scripts/experiment.py`。这是对已有实现与运行证据的核对，不代表所有异常都已覆盖。

## 从产生到可查询，中间会丢在哪里？

```text
组件／业务操作 → Span → 批处理队列 → 本地 Recorder → OTLP → Langfuse 查询
```

| 边界 | 检查什么 | 缺失时优先查哪里 |
| --- | --- | --- |
| 实际调用 → Span | 调用次数与 generation 对得上，预期工具节点存在 | 回调是否注册、组件是否触发、是否采样 |
| Span 结构与结束 | ID 不重复、父节点存在且同 Trace、有结束时间 | Context 传错、异步任务未结束、提前关闭 |
| 队列 → exporter | 丢弃量、导出错误、Flush 结果 | 队列饱和、网络、认证、截止时间 |
| 本地 → 平台 | 对照 Span ID、父关系、根输出和评分 | 入库延迟、字段映射、查询时间范围 |
| 平台数据 → 业务结论 | 订单一致、账本状态、审批结果 | 业务逻辑、证据缺口或评分器 |

实验 Recorder 先保存本地副本，再发送给下游。故 `spans.json` 存在不等于发送成功；HTTP 接收成功也不等于查询端已处理完成。批处理和[[opentelemetry-collector|采集管线]]的边界需要分开判断，本实验没有额外部署 Collector。

## 代码怎样自动核验？

`TestScenarioExports` 在本地检查重复 ID、孤儿 Span、跨 Trace 父节点、未结束 Span、唯一根节点及重试历史。`TestToolProposalsMatchExecutionAndDefinitions` 另查工具提议与执行对应。前者的 mock 测试通过，不能代替真实模型或平台验收。

`make verify` 进入 `scripts/experiment.py` 的 `verify(c, directory)`。`c` 是本地 Langfuse 配置，`directory` 是已完成批次的 artifact 目录；函数先读本地结果和 Span，再查询平台进行对照。下面保留函数、轮询和逐条核验的位置，省略分页参数、其他字段检查与异常处理，属于源码节选：

```python
# scripts/experiment.py
def verify(c, directory):
    results = json.loads((directory / 'results.json').read_text())
    spans = json.loads((directory / 'spans.json').read_text())
    pending = {r['trace_id']: r for r in results}
    deadline = time.monotonic() + 120
    details = {}
    while pending and time.monotonic() < deadline:
        for tid, r in list(pending.items()):
            # …原函数在 try/except 中处理每条 Trace，并计算查询时间范围…
            obs = pages(c, 'v2/observations', {
                'traceId': tid, # …时间范围、分页大小和所需字段…
            })
            actual = {o['id']: o for o in obs if isinstance(o, dict)}
            wanted = [s for s in spans if s['trace_id'] == tid]
            missing = []
            # …检查模型调用次数、必需节点与重试记录…
            for s in wanted:
                o = actual.get(s['id'])
                if not o:
                    missing.append(s['name'] + ':observation')
                    continue
                parent = s['parent_id'] if s['parent_id'] != '0000000000000000' else None
                if o.get('parentObservationId') != parent:
                    missing.append(s['name'] + ':parent')
                if not o.get('endTime'):
                    missing.append(s['name'] + ':endTime')
                # …检查输出和模型名…
            # …核对根结果、版本、错误状态、评分和实验项…
            if missing:
                details[tid] = missing
            else:
                del pending[tid]
                details[tid] = []
        if pending:
            time.sleep(3)
    # …把 pending 与 details 写入 verification.json；仍有缺项就抛错…
```

核验发生在导出后的独立步骤，不在每次模型调用内部阻塞等待。`pending` 中只移除通过所有检查的 Trace，暂时不可见的记录会进入下一轮查询。

实际实现最多等待 120 秒，缺项写入 `verification.json`，超时返回失败。运行 `make verify` 只读回已有结果，不再次调用模型。原运行 `20261012T163812Z-9ca91a89` 的结果为 `platform_visible=true`、`pending=[]`，表示这些断言当时通过；代码没有对每个消息字段都逐字比较，不能扩大为所有字段完全无损。

## 采样、队列满和服务不可达，怎样知道？

不能依赖丢掉的那条 Trace 报告自己丢失，需要独立计数或日志。`RunDiagnostics` 故意阻塞 exporter、缩小队列和降低采样率；已有独立诊断结果如下：

| 故障实验 | 实际记录 | 能说明什么 |
| --- | --- | --- |
| 队列容量 1，exporter 被阻塞 | 尝试 101 条，导出 2 条，检测到丢弃日志 | 这个故障路径的损失可以被发现 |
| 极低采样率 | 尝试 10 条，导出 0 条，检测到采样丢弃日志 | 没看到 Span 不代表操作没有发生 |
| 指向不可达端点 | 有界退出，错误可诊断 | 不会无限等待导出成功 |

这些测试使用回调自管 Provider。业务套件则使用应用自管 Provider，队列容量 8,192；不能把独立诊断的日志覆盖直接当作业务队列也已完整监控。真实运行还应独立跟踪调用量与导出量，必要时为自管批处理器补丢弃诊断。采样策略的取舍见[[agent-trace-capture|内容采集与保留]]。

正常退出会刷新队列，但刷新超时、进程被强制 kill、机器断电仍可能丢失尾部记录。本实验未证明这些场景的完整性，也未部署持久缓冲，不能据正常退出测试声称“所有数据绝不丢”。

## Trace 可信，为什么答案仍可能不可信？

“数据采得完整”与“Agent 做得正确”是两个命题。context/baseline 的 Trace 完整记录了订单污染，技术操作可以没有报错，但业务一致性评分失败；parameter/fixed 则正确拒绝错误订单，技术报错而测试通过。

因此 [[agent-trace-evaluation|业务验收与错例回归]]还要查看原始结果、加工结果、最终答复及实际账本。评分是程序提供的判据，不是 Langfuse 对正确性的保证；当前规则围绕合成订单与字符串检查，不能证明任意真实业务都可靠。
