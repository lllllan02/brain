---
title: "LangGraph 与 LangChain：从中断原语到人工决策"
parent: agent-human-in-the-loop
category: "Agent"
tags: ["Agent", "人工介入", "Checkpoint"]
created_at: "2026-10-13T10:59:51+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.langchain.com/oss/python/langgraph/interrupts"
  - "https://docs.langchain.com/oss/python/langchain/human-in-the-loop"
---

**「LangGraph 提供暂停与传回输入的原语，LangChain 中间件把它组织成工具审核流程。」** 本文节选这两层的衔接和恢复陷阱，按 2026-10-13 官方文档核对；未运行 Python 示例。

## 中断如何离开节点，又如何回来？

[Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) 的 `interrupt(payload)` 通过特殊异常把控制交回 Runtime，由 Checkpointer 保存状态。载荷须可序列化；调用方取得待处理问题后，可以结束当前请求。使用同一个 `thread_id`，通过 `Command(resume=回答)` 再次调用图，回答就成为对应 `interrupt` 的返回值。

恢复会**「从该节点开头重新执行」**。因此不要用宽泛的异常捕获吞掉中断；节点内多个中断的顺序也应保持稳定。并行分支同时等待时，可按 interrupt ID 分别传回答复。

文档用创建审核记录说明重跑风险：放在中断前的普通插入会重复，改成幂等写入或拆出节点可减少重复。把副作用移到批准之后解决的是审批顺序，不能据此推出任意崩溃窗口都只执行一次。

## 工具审核在哪一层发生？

[HITL middleware](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) 在**「模型响应之后、工具执行之前」**检查工具调用，依据 `interrupt_on` 构造待审动作和允许的决定类型，再触发底层中断。

| 决定 | 工具层行为 |
| --- | --- |
| `approve` | 按原参数执行 |
| `edit` | 使用修改后的动作执行 |
| `reject` | 跳过该调用，把拒绝意见交回模型 |
| `respond` | 将人的回答直接作为工具结果，适用于 `ask_user` |

`respond` **「不能用来表达拒绝有副作用的动作」**，否则模型会把它当作成功结果。多个工具动作分别需要决定，列表顺序须对应待审动作。大幅编辑参数可能改变模型后续路径，需要特别核对。

这些 API 提供执行语义；审批身份、权限、过期与重复提交如何进入业务校验，仍需由 [[agent-approval-protocol|人工审批协议]]明确，不能只靠一个布尔回复。
