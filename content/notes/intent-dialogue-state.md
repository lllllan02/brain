---
title: "意图参数与多轮状态"
aliases: ["Slot Filling", "Dialogue State Tracking"]
parent: agent-intent
category: "Agent"
tags: ["Agent", "意图识别", "状态管理"]
learning_status: pending
created_at: "2026-10-13T17:38:42+08:00"
updated_at: "2026-10-13T22:19:58+08:00"
reading_suggestions:
  - dialogflow-intent-design
  - rasa-slots
  - agent-task-state-update
---

识别出「查询退款资格」后，程序还需要订单号；用户下一轮只说「A」，又必须知道它是在补订单号。**填槽把话里的信息变成任务参数，对话状态跟踪则持续维护这些参数、当前目标和约束。** 两者连接起一句话的识别结果与可继续处理的任务。

## 怎样从一句话取出参数？

先按业务接口确定要收集什么。例如查询退款资格需要 `order_id`，提交退款还可能需要退款原因。槽位就是这些有名字的字段；哪些必填由接口决定，不能让模型临时猜。

对于「查订单 A 能不能退」，可以分别得到意图 `refund_eligibility` 与参数 `order_id="A"`。取得参数有几种办法：

- 格式稳定的订单号可用规则匹配，再检查上下文是否确实指订单。
- 训练实体抽取模型，用标注样本教它找出句中的订单号片段；抽出的实体再映射到 `order_id`。
- 用 LLM，提供字段定义、当前状态和用户原话，要求输出本轮明确提供或修改的字段，并保留对应原话作为依据。

[[rasa-slots|Rasa 的填槽机制]]展示了实体映射与 LLM 填槽两条路径。抽取订单号仍不足以解释「别退 A，查 B」：A 在否定范围内，B 才是查询对象。条件和否定需要一起理解，不能见到两个编号就把两笔订单都加入待退款列表。

## 为什么下一轮还要带旧状态？

「A」单独看不出任务；与上一轮「请提供订单号」一起看，才知道它填哪个字段。每轮输入因此至少包含当前消息、相关上一轮问答和最新状态。[[dialogflow-intent-design|Dialogflow 的参数机制]]将当轮抽取与会话中保留的参数区分，并允许表单复用已有值，避免重复询问。

下面用同一个退款任务推演。字段是教学设计，不是 SGD 或 Rasa 协议：`goal` 表示当前任务，`order_id` 是对象，`submit` 表示用户是否提出提交要求，`condition` 是提交条件。`null` 表示未知或无条件，含义按字段定义。

初始状态为 `{"goal":null,"order_id":null,"submit":false,"condition":null}`。

| 轮次与用户输入 | 本轮变化 | 合并后的状态 | 下一步 |
| --- | --- | --- | --- |
| 1．「查一下能不能退款」 | 建立查询目标，未提供订单号 | `{"goal":"refund_eligibility","order_id":null,"submit":false,"condition":null}` | 询问订单号 |
| 2．「A」 | 根据上轮问题补订单号 | `{"goal":"refund_eligibility","order_id":"A","submit":false,"condition":null}` | 查询 A 的退款资格 |
| 3．「能退且不收手续费就退，别动其他订单」 | 沿用 A，增加条件提交要求 | `{"goal":"refund_submit","order_id":"A","submit":true,"condition":"eligible_and_fee_zero"}` | 校验 A 的资格、费用及执行规则 |
| 4．「说错了，是 B；先别退，只查」 | 将对象改为 B，撤回提交要求 | `{"goal":"refund_eligibility","order_id":"B","submit":false,"condition":null}` | 查询 B，不能复用 A 的查询结果 |

此例假设第 4 轮到来时尚未提交退款；实际已提交就必须报告真实结果，不能通过改状态假装撤销。例中始终只保留一个明确对象；「别动其他订单」由这种作用范围限制落实。

## 状态应该保存在哪里？

自建服务可按 `tenant_id + session_id` 保存一个状态对象，放在持久化数据库或有合适过期策略的会话存储中；LLM 上下文只是本轮输入，不能代替服务端的最新状态。下面是退款场景的自拟结构，部署方案尚未实测：

```json
{
  "version": 12,
  "goal": "refund_eligibility",
  "order_id": "A",
  "pending_question": null,
  "submit": false,
  "condition": null,
  "facts": {"order_id": "A", "eligible": true},
  "execution": {"status": "not_started"}
}
```

正在询问订单号时，`pending_question` 可记录 `{"field":"order_id","asked_at_turn":3}`，用于解释下一轮的短回答；完成补参后清除，因此上述已知订单 A 的状态为 `null`。`facts` 来自业务系统，模型只能提议更新用户表达字段；[[rasa-slots|Rasa 的 controlled 槽位]]提供了限制概率式填值的产品参考。登录身份、权限、支付状态同样不能由用户话语直接覆盖。

会话超时后，应清理未完成询问和过期业务事实；重新进入退款流程时重新校验对象。长期任务的保存和恢复由[[agent-task-state-update|任务状态更新]]负责，不应无限延长临时槽位的生命周期。

## 谁来合并和校验？

可让模型输出本轮变更，再由程序合并。第 4 轮的变更可以写成：

```json
{"set":{"order_id":"B","goal":"refund_eligibility","submit":false},"clear":["condition"]}
```

程序依次检查允许的字段及类型、应用明确修改、保留未提及的旧值、清除已撤回内容，再根据当前目标重算缺失参数。不能把「本轮没抽取到订单号」当成清空订单号；也不能用新对象 B 搭配旧对象 A 的资格结果。对象变化后，应使依赖该对象的查询结果失效。

**用户要求、业务事实和执行结果需要分开记录。** 模型能解释「免费才退」，不能据此填写「手续费为零」；后者来自业务查询。`submit=true` 也只记录用户表达，程序仍要检查执行条件。模型提出的变更只有通过校验并写入，才成为下一轮的状态。

还要处理并发：读取版本 12 后发起识别，用户又改为 B，旧请求的 A 查询结果可能稍后返回。保存时可检查预期版本或按会话串行处理；版本已变化就重新核对，不把旧结果覆盖到新对象上。这里的版本控制是业务设计建议，不能由提示词保证。

回归用例应覆盖补参、改口、撤回、切换任务后返回、会话超时，以及两个请求乱序完成。原始字段与累计状态的区别也可参考 [[schema-guided-dialogue|SGD 的标注结构]]，但它不提供数据库并发和执行幂等保证。

这套合并规则是退款示例的设计推导，尚未接入真实系统验证。若「还是那个」可能指 A 或 B，应保留歧义并追问；已经提交的退款则查询真实执行状态，不能靠清空槽位伪装成撤销。
