---
title: "Go JSON 类型兼容"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "JSON", "数据兼容"]
type: "practice"
---

**兼容外部 JSON 要限定到具体字段和明确的转换规则。** 把任意类型都强转成目标类型并吞掉错误，会把「输入错误」变成看起来合法的零值，之后很难追踪。

例如历史接口把整数同时编码成 `123` 和 `"123"`，可以为该字段定义明确的整数适配类型：先区分 JSON number、string、null 等形式，再按十进制整数解析、检查溢出，成功后才赋给目标值。小数、布尔值、空串以及 null 是否允许，都由接口合同决定，不能自动猜测。

默认把 JSON 解码到 any 时，数字通常成为 float64，大整数可能先损失精度、再也无法恢复。需要保留数字文本时可以用 Decoder.UseNumber、json.Number 或 RawMessage，之后按字段范围解析。

**自定义 UnmarshalJSON 应先把结果写入临时值，完整校验成功后再提交**，避免失败时留下半修改状态。整个对象也要求「全成或全败」时，先解码到临时对象再替换。字段缺失和显式 null 不同，接收者是否被调用、是否保留旧值也要分别处理。

[[go-generics|泛型约束]] 能减少重复代码，但替代不了业务转换规则；命名类型、溢出和空值策略仍需显式定义。原笔记的通用 Flexible 转换器因此改为这一受限兼容方法，没有保留静默转换示例。

可以把合法值、空值、溢出与非法类型作为固定回归输入，再用 [[go-fuzzing|fuzzing]] 检查「拒绝非法输入且不留下半修改状态」这类性质。

接口依据：[encoding/json](https://pkg.go.dev/encoding/json)、[strconv.ParseInt](https://pkg.go.dev/strconv#ParseInt)。
