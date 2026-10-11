---
title: "JSON-RPC（基于 JSON 的远程过程调用协议）"
aliases: ["JSON-RPC", "JSONRPC", "JSON-RPC 2.0"]
category: "计算机基础"
tags: ["JSON", "协议"]
created_at: "2026-10-11"
source:
  - "https://www.jsonrpc.org/specification"
---

**JSON-RPC 是用 JSON 表达方法调用及其结果的轻量协议，约定消息格式，不限定消息通过什么通道传输。** RPC（Remote Procedure Call，远程过程调用）表达「请另一端执行某个方法并返回结果」；这里采用 JSON-RPC 2.0。

下面用一个假设的加法方法展示一次调用：

```json
{"jsonrpc":"2.0","method":"add","params":[2,3],"id":1}
```

成功回复：

```json
{"jsonrpc":"2.0","result":5,"id":1}
```

`method` 指定方法，`params` 携带参数，`id` 将回复与请求对应起来。成功回复包含 `result`，失败回复包含 `error`，二者不能同时出现。没有 `id` 的请求称为「通知」，接收方不返回 JSON-RPC 响应。协议还支持批量调用；以上规则见 [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification)。

JSON 只规定数据如何表示，JSON-RPC 进一步规定方法调用与回复如何组织。它可以通过不同通道传输，也可以用于同一进程内的调用；协议本身不负责身份认证、权限判断或业务逻辑。
