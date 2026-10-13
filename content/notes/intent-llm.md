---
title: "用 LLM 实现意图识别"
parent: agent-intent
category: "Agent"
tags: ["Agent", "意图识别", "工具调用"]
learning_status: pending
created_at: "2026-10-13T17:38:39+08:00"
updated_at: "2026-10-13T17:44:44+08:00"
---

**用 LLM 做意图识别，就是把任务边界、判断示例和用户输入交给语言模型，让它生成任务标签及参数，再由程序读取并选择处理流程。** 这种做法可以直接使用预训练模型，无需先训练一个专用分类器；业务含义仍需开发者定义。

下面用订单退款串起「提示 → JSON → 校验 → 路由」。提示、字段和 Go 风格伪代码均为自拟教学示例，未实测，不是任何 SDK 的现成接口；只覆盖单个当前请求，不覆盖多目标和条件执行。

**待展开：** 多目标和条件请求的输出结构及程序处理。当前三字段示例不能表达「不收手续费才退」的条件；需要进一步说明如何保存条件、绑定对应任务并在执行前检查，不能仅输出 `refund_submit` 而遗失约束。

## 先告诉模型要区分什么

如果只给 `refund` 一个标签，「退款规则是什么」和「把订单 A 退掉」都会归入同类，程序无法决定回答还是执行。因此先按后续处理的差异定义类别：

| 标签 | 含义 | 后续处理 |
| --- | --- | --- |
| `refund_policy` | 询问通用退款规则 | 查规则并回答 |
| `refund_eligibility` | 查询某订单能否退款 | 查订单与资格 |
| `refund_submit` | 要求提交某订单退款 | 进入退款流程 |
| `unclear` | 无法确定希望做什么 | 询问关键歧义 |
| `unsupported` | 任务明确，但不在以上能力内 | 说明能力范围 |

[[anthropic-intent-routing#分类提示包含什么？|Anthropic 的分类教程]]采用「类别、输入、示例、输出格式」组成提示。这里把宽泛的退款类别进一步区分为查询和操作，形成以下系统提示：

```text
你负责提取当前请求，不执行退款。
按所附类别表选择 intent；不支持的任务用 unsupported。
提取 order_id，只使用用户消息或相关上下文中的值；未知为 null。
不要从情绪推断提交要求。“能不能退”归资格查询。
任务明确但缺订单号时保留任务标签，不改成 unclear。
输出 intent、order_id、question 三个字段，question 无需提问时为 null。
unclear 时 question 写能区分任务的问题；需要订单却缺失时询问订单号。

输入：退款规则是什么？
输出：{"intent":"refund_policy","order_id":null,"question":null}
输入：订单 A 能退吗？
输出：{"intent":"refund_eligibility","order_id":"A","question":null}
输入：帮我退订单 A。
输出：{"intent":"refund_submit","order_id":"A","question":null}
输入：帮我退款。
输出：{"intent":"refund_submit","order_id":null,"question":"要退哪笔订单？"}
```

程序把类别表和上述提示作为固定配置，把当前输入作为用户消息传入。示例用于展示边界；真正要处理的消息需单独提供，不能让模型把示例中的订单 A 当成用户当前对象。

## 一次请求怎样变成 JSON？

假设当前消息是「查一下订单 B 能不能退，先别提交」，期望结果为：

```json
{
  "intent": "refund_eligibility",
  "order_id": "B",
  "question": null
}
```

此时识别已经完成：模型选择「查询资格」，并提取对象 B。模型还没有查到订单数据，更不知道实际退款资格。

为便于程序读取，还需声明 JSON Schema：`intent` 是表中五个值之一，`order_id` 和 `question` 是字符串或 `null`，三个字段必填，禁止额外字段。支持[[anthropic-intent-routing#输出怎样变得可解析？|结构化输出]]的接口会使用这份结构约束；仅在提示中写 JSON 要求时，程序必须应对多余文字、缺字段等格式错误。

**「结构正确」只证明结果能按约定读取。** 即使 JSON 完全合法，模型仍可能误选 `refund_submit`，或把 B 抄成 A；这类语义错误需要用真实输入及预期答案评测，不能靠 Schema 消除。

## 程序收到结果后做什么？

下面的 `Recognize` 代表应用封装的模型请求，包含固定提示、当前输入与 Schema；`Complete` 只在响应正常完成且未拒绝时为真。其余名称也都是说明职责的伪接口，由请求处理器调用：

```go
func Handle(user User, text string) Reply {
    raw, err := Recognize(text)
    if err != nil || !raw.Complete { return ServiceFailure() }
    task, err := ParseAndValidateSchema(raw.Text)
    if err != nil { return ServiceFailure() }

    if task.Intent == "unsupported" { return ExplainScope() }
    if task.Intent == "unclear" {
        if task.Question == nil { return Ask("希望我查询什么或执行什么？") }
        return Ask(*task.Question)
    }
    if task.Intent == "refund_policy" { return AnswerRefundPolicy() }
    if task.OrderID == nil { return Ask("要查询或处理哪笔订单？") }

    order, err := LoadOwnedOrder(user.ID, *task.OrderID)
    if err != nil { return OrderUnavailable() }
    if task.Intent == "refund_eligibility" {
        return AnswerEligibility(order) // 只查资格，不提交
    }
    return RefundWorkflow(user, order) // 再查资格、权限及业务执行条件
}
```

程序根据标签选择分支，这一步就是「路由」。必填参数由程序再次检查，订单归属由业务查询确认；`refund_submit` 只决定进入退款流程，不能让模型填写的标签替代权限和业务条件。业务也可能需要用户补选商品或金额，应由对应流程继续处理。

## 是否必须单独调用一个分类模型？

不必须。类别决定不同工作流时，独立识别便于单独评测和排查误路由。如果 Agent 已有 `check_refund_eligibility` 等[[tool-calling|工具]]，模型也可以依据工具描述直接提出调用，把任务理解与动作选择放在同次请求中。

两者可以组合：先选业务流程，流程内再选工具。无论采用哪种组织，程序都要校验对象和执行条件；新增一次分类调用是否值得，应比较它带来的路由收益、延迟和错误，而不能把独立「意图 Agent」当成必备组件。
