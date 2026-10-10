---
parent: codex-sandbox-overview
title: "Codex 如何用凭据代理替代子进程中的真实密钥"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[网络代理运行时](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/network-proxy/src/runtime.rs#L514)", "[目标绑定测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/network-proxy/src/credential_broker_tests.rs#L1412)"]
---

**Codex 的凭据代理把子进程拿到的占位值，与目标服务收到的真实凭据分开，减少直接暴露密钥的需要。**

## 一次认证如何完成

启用代理后，运行时从父环境发现配置支持的凭据，再虚拟化子环境。子进程仍使用熟悉的认证变量名，但得到的是占位值；请求经过可信代理时，只有匹配获准目标才注入真实凭据。

源码中的目标绑定测试使用假密钥：默认 API 和配置的可信主机收到真实测试值，攻击者主机收到的仍是占位值。这验证了“持有变量”与“对任意目标使用凭据”可以分离。

## 隔离的边界

机制依赖代理启用、凭据识别及可信目标配置，不自动覆盖全部秘密。子进程即使看不到密钥，仍可能调用已授权接口，所以[[sandbox-credentials|凭据隔离]]还需配合接口权限与网络目标限制。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
