# 阅读节选：labs/agent-trace，提交 be79b00。
# Eino v0.9.14 / Langfuse 回调 v2.0.2；省略依赖与部分逻辑，不能独立运行。

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
