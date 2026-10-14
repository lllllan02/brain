---
learning_status: pending
title: "从订单示例实现最小 Agent 评测"
parent: agent-evaluation
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T11:03:11+08:00"
updated_at: "2026-10-13T11:03:11+08:00"
reading_suggestions:
  - agent-trace-evaluation
  - inspect-agent-evaluation
  - agent-evaluation-statistics
---

**最小评测程序要让输入、执行环境和验收规则分开，并能从失败分数回到实际证据。** 先用可控实现验证这条链路，再接入模型，能避免在 Agent 和评分器同时出错时无法定位。

## 这个示例验证什么？

Go 示例位于 `content/assets/agent-evaluation-demo.go`，用订单 A、B 的内存账本，运行三类任务：已确认退款、未确认请求、已退订单的重复请求。每个任务独立保存初始状态、预期账本和应答状态。

五个被测函数分别模拟按规则执行、只宣称成功、退错订单、重复写入和无条件写入。**「被测函数是脚本替身」**，没有调用 LLM、真实退款或 Langfuse；结果仅验证示例中的执行与评分逻辑，不代表任何模型的能力。

模拟工具故意不拦错误动作，让评分器可以看到违规。生产工具应独立校验授权与幂等，不能照搬这个宽松后端。

## 怎样运行和看结果？

安装 Go 后，在 Horizon 根目录运行，无第三方依赖：

```sh
go run content/assets/agent-evaluation-demo.go > /tmp/agent-evaluation-results.jsonl
```

逐次结果写到 JSONL，汇总写到终端。2026-10-13 本地运行得到：

```text
compliant: 3/3
claim_only: 0/3
wrong_order: 0/3
double_write: 0/3
always_write: 1/3
```

其中 `claim_only` 在正常退款任务的回复状态正确，但账本没变，结果仍失败；`always_write` 只通过正常任务，在未确认和已退款任务上分别暴露越界与重复写入。比起只保留总分，这些差异能说明哪一项要求没满足。

## 哪段代码承担评测职责？

`main` 遍历任务和候选函数，调用同文件的 `run`。下面节选 `run` 的执行边界，返回结构的其余标识字段省略：

```go
func run(t task, name string, a Agent) result {
    e := &environment{ledger: clone(t.initial), writes: []string{}}
    response := a(t.request, e)
    return result{
        // trial、task、candidate 和版本字段见完整文件
        Status: response, Writes: e.writes, Ledger: e.ledger,
        Score: grade(t, e, response),
    }
}
```

每次 `clone` 初始账本，避免上一次写入影响下一次。Agent 只收到 Request 与 Tools，没有拿到 expected 或预期状态；`grade` 比较完整账本、写入对象与确认条件、应答状态，三项全通过才算通过。

这只是代码接口上的分离，没有操作系统隔离。任意不可信代码不应与答案和评分器共处同一进程。真实自然语言应答也不能靠字符串状态枚举全面验收，需要额外的语义与证据评分。

## 怎样接入自己的 Agent？

保留任务加载、环境初始化、评分和结果保存，用适配器替换脚本函数：输入为真实用户请求，工具调用接测试环境，返回最终消息及实际用量，同时采集轨迹。需要错误与取消状态时扩展返回类型，不能把 API 错误编码成正常回答。

已有[[agent-trace-evaluation|订单 Trace 实验]]展示了真实执行记录、故障注入和分数关联；在此基础上应补任务与评分版本、独立试次环境和重复运行，而非重新实现一套观测 SDK。要在成熟框架中承载这些职责，可以将任务映射到[[inspect-agent-evaluation|Inspect 的 Dataset、Solver、Scorer]]，或映射到[[harbor-evaluation|Harbor 的任务包]]。

真实接入还需验证上下文取消、预算限额、部分失败、异步写入回执和进程清理；对话中的确认应按对象、操作与版本核对事件顺序。这个示例用静态确认字段简化了交互，不覆盖上述机制。

## 从跑通到有用还差什么？

先用已知正确与错误实现检查评分器，再替换为真实模型；加入正常与故障切片，最后比较两个版本并按[[agent-evaluation-statistics|重复实验与统计方法]]报告波动。保留一批未用于调试的任务，避免仅证明这三个例子能通过。

本示例已运行并核对 15 条结果的账本、边界和应答评分；尚未进行模型调用、模型裁判校准或生产环境实验。
