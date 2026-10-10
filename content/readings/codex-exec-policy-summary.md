---
title: "Codex：命令规则、审批与沙箱如何共同决策"
parent: tool-permissions
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10T20:44:35+08:00"
updated_at: "2026-10-10T20:44:35+08:00"
source:
  - "https://learn.chatgpt.com/docs/agent-configuration/rules"
  - "https://github.com/openai/codex/blob/main/codex-rs/core/src/exec_policy.rs"
---

**Codex 将命令规则、审批模式和沙箱配置共同用于执行决策；未匹配明确规则，不必然意味着必须人工审批。** 以下为 2026-10-10 文档与源码阅读，未运行验证；源码链接指向会变化的 `main`。

## 命令规则怎样表达？

[Rules 文档](https://learn.chatgpt.com/docs/agent-configuration/rules#understand-rule-fields)用 `prefix_rule` 匹配参数列表，例如 `pattern=["git", "status"]`。结果有 `allow`、`prompt`、`forbidden`，多条规则命中时采用更严格结果。规则支持 `match`、`not_match` 示例，加载时校验是否符合预期。

这里的 `allow` 涉及允许命令在沙箱外运行，不能直接等同于业务系统的用户权限。

对能够安全拆分的简单 Shell 命令链，Codex 解析并逐条匹配。例如允许 `git add`，不能顺带放行 `git add . && rm -rf /`。该处理有语法范围限制，不代表能推断任意脚本副作用，详见[Shell 包装与复合命令](https://learn.chatgpt.com/docs/agent-configuration/rules#shell-wrappers-and-compound-commands)。

## 源码如何决定后续处理？

[`exec_policy.rs`](https://github.com/openai/codex/blob/main/codex-rs/core/src/exec_policy.rs)将求值结果转换为执行要求：

- `Forbidden`：拒绝执行。
- `Prompt`：审批模式允许时返回 `NeedsApproval`；禁止该类审批时转为拒绝。
- 没有明确规则覆盖：结合危险命令判断、审批模式和沙箱配置处理。在 `OnRequest` 的受限沙箱下，非危险且未请求突破沙箱的命令可以直接受限执行。

因此，「不询问」不能单独解释为「无限制执行」。设计上可以预先授权沙箱内的一类操作，把越界申请交给审批。实际启动和拒绝后的处理分别见[[codex-sandbox-launch|命令进入沙箱]]、[[codex-sandbox-retry|沙箱拒绝后的重试]]。
