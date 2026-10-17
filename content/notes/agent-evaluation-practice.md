---
learning_status: pending
title: "Agent 评测示例"
parent: agent-evaluation
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T11:03:11+08:00"
updated_at: "2026-10-17T23:30:09+08:00"
reading_suggestions:
  - agent-trace
---

**这个 Go 示例用可控的订单任务演示「初始化 → 执行 → 独立评分 → 保存结果」。** 先确认评分器能识别已知错误，再接入真实 Agent，便于区分运行与验收两侧的问题。

## 运行示例

[[assets/agent-evaluation-demo.go|完整代码]]无第三方依赖；安装 Go 后，在 Horizon 根目录运行：

```sh
go run content/assets/agent-evaluation-demo.go > /tmp/agent-evaluation-results.jsonl
```

示例为订单 A、B 建立内存账本，覆盖已确认退款、未确认请求和重复请求。五个候选函数分别模拟合规执行、只宣称成功、退错订单、重复写入与无条件写入，**「没有调用模型或真实服务」**。

逐次结果保存为 JSONL，包含账本、写入记录和分项评分；汇总写到终端。2026-10-13 已有本地运行记录为：

```text
compliant: 3/3
claim_only: 0/3
wrong_order: 0/3
double_write: 0/3
always_write: 1/3
```

`claim_only` 声称成功却没有改变账本，仍判失败；`always_write` 只通过正常任务，在另两类任务暴露未确认写入和重复退款。这些结果只验证示例逻辑，不代表模型能力。

## 执行与验收怎样分离

`main` 遍历任务和候选函数，调用 `run`；`run` 复制初始账本，只把 `Request` 和 `Tools` 交给候选，再调用 `grade` 检查完整账本、写入对象与确认条件、应答状态。三项全通过才算通过，隐藏预期不作为候选输入。

这里是接口分离，没有进程或文件权限隔离；确认也被简化为静态字段。模拟工具故意允许错误动作以便观察，生产工具仍须自己校验授权和幂等。

## 接入真实 Agent

保留任务、环境、评分与结果保存，用真实调用替换候选函数：用户请求进入应用，工具连接隔离测试资源，返回最终消息和实际用量，并采集[[agent-trace|执行轨迹]]。错误与取消单独返回，异步操作等待可信回执，不能把请求已提交当作已完成。

再补真实交互的确认事件、超时和预算控制、语义评分；按[[agent-evaluation#运行与比较|相同条件下的重复运行]]比较版本。2026-10-13 的运行记录核对了 15 条脚本结果，尚未验证模型接入或生产环境。
