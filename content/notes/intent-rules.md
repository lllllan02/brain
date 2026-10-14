---
title: "用规则实现意图识别"
parent: agent-intent
category: "Agent"
tags: ["Agent", "意图识别"]
learning_status: pending
created_at: "2026-10-13T21:58:19+08:00"
updated_at: "2026-10-13T22:19:58+08:00"
reading_suggestions:
  - dialogflow-intent-design
  - intent-evaluation
---

**规则式意图识别由开发者把句式与任务标签的对应关系写进程序，收到输入后按条件匹配，无需训练。** 固定命令和少量约定句式可以用它快速启动；如果前端按钮已有明确的动作 ID，后端应直接校验该 ID，无需再分类按钮文案。自由表达越多，需要维护的规则与冲突也越多。

以订单客服为例，先区分 `refund_eligibility`（查退款资格）、`refund_submit`（申请退款）和 `track_order`（查物流）。规则检查整句话是否符合约定句式，输出标签和命中的规则编号；订单号提取属于另一步。

## 怎样避免出现关键词就误判？

如果用「包含申请退款」作为提交规则，「不要申请退款，只问能退吗」也会命中。可以增加否定排除和优先级，但局部关键词无法可靠表达任意否定作用范围。下面选择「整句匹配」：只接受明确列出的说法，无法覆盖的表达交给回退。

这是一种自拟的保守实现，和 [[rasa-intent-classification|Rasa 分类资料]]中的关键词基线同属规则路线，并非复刻 Rasa 组件。规则匹配可以直接产出标签；把正则命中作为模型特征则仍需要分类器判断。

## 可运行的 Go 示例

保存为 `main.go`，运行 `go run main.go`。只依赖标准库；代码先规范首尾空白和句尾标点，再收集命中标签。同一标签的多条规则可以合并，不同标签同时命中则返回 `ambiguous`，不靠规则排列顺序偷偷选择。

```go
package main

import (
    "fmt"
    "regexp"
    "strings"
)

type Rule struct {
    ID, Intent string
    Pattern *regexp.Regexp
}

var rules = []Rule{
    {"eligibility", "refund_eligibility", regexp.MustCompile(`^(请问)?订单[A-Za-z0-9]+(能退吗|能不能退|是否可以退款)$`)},
    {"query_only", "refund_eligibility", regexp.MustCompile(`^不要申请退款[，,]?只问订单[A-Za-z0-9]+能退吗$`)},
    {"submit", "refund_submit", regexp.MustCompile(`^(请)?(帮我)?(申请退款|退订单[A-Za-z0-9]+)$`)},
    {"tracking", "track_order", regexp.MustCompile(`^(请)?(帮我)?查订单[A-Za-z0-9]+(物流|到哪了)$`)},
}

func Recognize(text string, rs []Rule) (string, []string) {
    text = strings.TrimRight(strings.TrimSpace(text), "。！？.!?")
    labels := map[string]bool{}
    ids := []string{}
    for _, r := range rs {
        if r.Pattern.MatchString(text) {
            labels[r.Intent] = true
            ids = append(ids, r.ID)
        }
    }
    if len(labels) == 0 { return "no_match", ids }
    if len(labels) > 1 { return "ambiguous", ids }
    for label := range labels { return label, ids }
    panic("unreachable")
}

func main() {
    for _, text := range []string{
        "订单A能退吗？", "请帮我退订单A", "帮我查订单A物流",
        "不要申请退款，只问订单A能退吗", "我不是要申请退款",
        "查订单A物流并申请退款", "帮我订机票",
    } {
        intent, ids := Recognize(text, rules)
        fmt.Printf("%s -> %s %v\n", text, intent, ids)
    }
}
```

这组输入依次得到 `refund_eligibility`、`refund_submit`、`track_order`、`refund_eligibility`，最后三条为 `no_match`。命中编号可解释程序为什么得到这个结果；`no_match` 只说明规则未覆盖，不能证明请求不属于业务范围。

## 接进服务时，规则还缺什么？

[[dialogflow-intent-design|Dialogflow 的作用范围机制]]提示：规则除了匹配文字，还要限制生效状态。退款确认页上的「确认」可以绑定当前申请，普通聊天中的「确认」不能触发退款。应用可给规则配置 `allowed_state`、`rule_id` 和版本；这属于自建规则表设计，不是上面示例已实现的字段。

如果与分类器组合，约定唯一决策顺序：固定命令匹配 → 得到一个合法任务则返回；未命中交给模型；不同任务冲突则澄清。不要让「第一个命中」偶然决定结果，也不要把规则漏匹配直接标为业务不支持。需要显式优先级时，为被覆盖规则增加反例测试。

## 规则怎样维护，结果怎样使用？

增加说法时先从日志判断：是规则未覆盖、类别含义不清，还是当前状态不允许。确定要接受该表达后再修改模式，同时保留明确请求、否定、相似说法和多目标请求作为回归样本。例如「我不是不能退款」涉及双重否定，这套规则会回退，不能因为包含「退款」就推断任务。

当前规则有意不覆盖自然语言的全部变化，也不处理多轮指代。无法匹配或命中冲突时，按 [[intent-clarification|澄清与回退]]继续；如果大量正常请求都回退，可以改用训练样本的文本分类器或 LLM。规则也可只负责固定命令，其他输入交给模型。

**「识别出退款申请」只代表进入退款流程。** 缺少订单号时补参数，有订单号时仍需检查归属、资格及业务执行条件。本示例只打印识别结果，不调用订单接口。

上线记录规则版本、命中编号、未匹配率和错误命中样本；无命中的真实请求经过人工确认后再补规则。[[intent-evaluation|上线评测]]需比较新旧版本，不能用规则条数或命中率增长证明质量提升。若规则维护已需要大量否定补丁，应重新评估适用范围。

验证：Go 1.25.6；文中七条输入及额外的规则冲突用例已在本地运行，结果符合上述约定。这验证规则实现，不代表真实客服表达的覆盖率。
