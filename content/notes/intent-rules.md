---
title: "用规则实现意图识别"
parent: agent-intent
category: "Agent"
tags: ["Agent", "意图识别"]
learning_status: understood
created_at: "2026-10-13T21:58:19+08:00"
updated_at: "2026-10-14T08:43:58+08:00"
reading_suggestions:
  - dialogflow-intent-design
  - intent-evaluation
---

**规则式意图识别是用人工编写的匹配条件，把用户表达映射为意图标签，无需训练。** 适合固定命令和少量约定句式；按钮已有动作 ID 时直接校验，无需识别文案。

## 规则具体怎样匹配？

可以用字符串相等、关键词或正则表达式（Regular Expression）匹配。例如下面这句 Go 逻辑片段：

```go
if strings.Contains(text, "申请退款") { return "refund_submit" } // 申请退款
```

## 怎样避免出现关键词就误判？

上面的规则也会命中「不要申请退款」。可以改为正则整句匹配，只接受约定句式：

```go
if regexp.MustCompile(`^(请)?(帮我)?申请退款$`).MatchString(text) { return "refund_submit" }
```

`^…$` 限定整句，`?` 表示前面的部分可省略。因此「请帮我申请退款」命中，「不要申请退款」不命中。**「减少误命中的代价是漏掉更多说法」**；未覆盖的表达应回退，不能视为业务不支持。

下例采用这条保守路线，另列查询资格、物流和特定否定句的规则。它是自拟实现；[[rasa-intent-classification|Rasa 分类资料]]还区分了直接输出标签的规则与仅向模型提供特征的正则。

## 可运行的 Go 示例

保存为 `main.go`，运行 `go run main.go`，只依赖标准库。`Recognize` 清理空白和句尾标点后检查所有规则：同标签合并，无命中返回 `no_match`，不同标签冲突返回 `ambiguous`；同时返回命中编号。

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

七条输入依次得到 `refund_eligibility`（查退款资格）、`refund_submit`（申请退款）、`track_order`（查物流）、`refund_eligibility`，最后三条为 `no_match`。

## 接进服务时，规则还缺什么？

- 生效状态：退款确认页的「确认」可绑定当前申请，普通聊天中的「确认」不能触发退款。可参考 [[dialogflow-intent-design|Dialogflow 的作用范围机制]]增加状态约束，示例尚未实现。
- 回退顺序：唯一命中则返回，未命中可交给模型，冲突则按 [[intent-clarification|澄清与回退]]处理。不要按规则排列顺序取第一个命中；设置优先级时须为被覆盖规则补反例测试。
- 执行校验：**「识别出申请不等于执行退款」**。仍需提取或补齐订单号，检查归属、资格与执行条件；示例只打印结果，不处理多轮指代或调用业务接口。

## 规则怎样维护？

记录规则版本、命中编号、未匹配率和错误样本。补规则前先区分覆盖不足、类别不清与状态不允许；将明确请求、否定、相似说法和多目标请求保留为回归样本，并按 [[intent-evaluation|上线评测]]比较新旧版本。

命中率增长不代表质量提升。正常请求大量回退或否定补丁持续增加时，应考虑文本分类器或大语言模型（LLM），规则只保留固定命令。

验证：Go 1.25.6；完整示例的七条输入及额外冲突用例已在本地运行，结果符合约定，不代表真实客服表达的覆盖率。
