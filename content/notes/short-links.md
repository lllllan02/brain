---
title: "短链接（Short URL）"
category: "系统设计"
updated_at: "2026-10-09"
tags: ["短链接"]
aliases: ["短网址", "Short URL", "URL Shortener"]
---

**短链接（Short URL）是通过短网址访问目标地址的方式，服务端保存短网址与目标 URL 的映射，便于分享和传播。**

例如，将 `https://example.com/products/detail?id=123456` 对应到 `https://s.example/aB12x`，其中 `aB12x` 是用于查找目标的[[short-code|短码]]。用户访问短网址后，服务端查询目标 URL，再通过 HTTP 重定向（如 301 或 302）让浏览器跳转。

短链接服务还可以统计访问情况。具体的[[short-link-storage|映射存储与解析]]需要处理短码唯一性、有效期和目标变更。
