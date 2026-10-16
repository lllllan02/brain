---
learning_status: pending
parent: agent-sandbox
title: "沙箱凭据保护"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-16T20:50:59+08:00"
reading_suggestions:
  - codex-credential-broker
  - docker-sandboxes-practice
  - e2b-sandbox-practice
---

**凭据保护要解决：任务需要调用有认证的服务，但不应因此获得可随意复制的真实密钥。** 把 key 放进程序可读的环境变量或文件，它就可能进入日志、输出或外发请求。

| 任务情况 | 对应做法 |
| --- | --- |
| 不需要认证 | 不传凭据，清理输入文件和继承的环境变量 |
| 只需固定业务操作 | 由沙箱外的可信工具保存密钥，Agent 只提交参数、接收结果 |
| 要自己写脚本或运行 SDK | 接认证代理：程序使用占位值或不带认证，代理在沙箱外注入真实 key |
| 工具无法接代理 | 提供短期、限权、可撤销凭据；程序仍能读取，只是降低泄露后果 |

代理认证的过程是：**程序发请求 → 代理检查任务与目标 → 加入真实 key → 转发给 API**。代理地址和占位值可以公开给程序，密钥与修改代理规则的权限留在外面。普通网络转发不一定能处理 HTTPS 认证头，需使用支持该能力的代理。

隐藏密钥还不够：必须限制可调用的服务、操作与额度，避免程序借代理越权；目标响应和调试日志也不能回显秘密。SSH agent 等接口即使不交出私钥，也会授予认证能力。

[[e2b-sandbox-practice|E2B]]和[[docker-sandboxes-practice|Docker Sandboxes]]有集成用法，普通容器需要另外接代理；[[codex-credential-broker|Codex 源码]]展示占位值与目标绑定。用测试凭据验证正常调用与未授权请求。[Docker 凭据代理](https://docs.docker.com/ai/sandboxes/configuration/credentials/)、[E2B 注入](https://docs.e2b.dev/secrets/inject)

## 密钥藏在代理里，Agent 还能滥用它吗？

虽然程序读不到密钥，但若代理允许任意请求，Agent 仍可以借它发送邮件、创建资源或大量调用收费接口。隐藏秘密降低泄露风险，却没有自动限制凭据所代表的能力。

代理应根据任务身份限定目标、操作、参数范围和额度，不能让调用方通过自填身份或任意地址获得授权。短期凭据也应有撤销与到期处理；长任务恢复后重新检查有效性，不把旧环境中还能发出请求当作继续获准。

诊断时避免把认证头、命令环境或完整 SDK 调试输出写入 Trace。用假凭据检查正常调用、错误返回和重定向路径，既验证没有泄露，也验证未授权操作确实被拒绝。
