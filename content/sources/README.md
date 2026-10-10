本目录保存外部参考资料的原文或问答导出，供后续核实与知识整理使用。资料不作为已确认的知识库结论。

网页读取与 Pages 导出当前只收录 `content/notes/`、`content/inbox/`，本目录不参与网页渲染。

## Claude Code 沙箱：DeepWiki 问答

- 来源：[DeepWiki 问答页面](https://deepwiki.com/search/-agent-shell-agent-mcp_9db6ff87-1677-4bd8-adbe-496c83efb257?mode=fast)。
- 分析对象：`anthropics/claude-code`。
- 保存日期：2026-10-10。
- 保存依据：用户提供的完整文本附件；未重新抓取网页或改写回答。
- 仓库版本／commit：导出文本未明确提供，待核实；保存日期不代表源码版本。
- 内容性质：DeepWiki 生成的源码问答，非 Anthropic 官方说明。本次仅保存，未逐项核实回答中的机制判断。
- 证据限制：多处回答自述依据 CHANGELOG、类型声明和 devcontainer 配置，缺少实际沙箱实现源码；原文中的推断与 Notes 均完整保留。

原始导出标题：`# DeepWiki Q&A with Code Context for Repository: anthropics/claude-code`

按原始 Q1–Q11 边界拆分，问题、回答、代码片段、引用和顺序均保留。`claude-code:行号` 为原导出的引用标记，应结合每篇 Citations 中的文件与代码片段阅读。原文的 `/wiki/...` 相对链接以 `https://deepwiki.com` 为基址，例如 [Claude Code Overview](https://deepwiki.com/wiki/anthropics/claude-code#1)。

| 原问题 | 内容 |
| --- | --- |
| Q1 | [隔离范围与组件边界](claude-code-sandbox-q01-boundaries.md) |
| Q2 | [命令执行调用链](claude-code-sandbox-q02-execution.md) |
| Q3 | [平台机制与策略转换](claude-code-sandbox-q03-platforms.md) |
| Q4 | [文件访问限制](claude-code-sandbox-q04-filesystem.md) |
| Q5 | [网络访问限制](claude-code-sandbox-q05-network.md) |
| Q6 | [子进程与清理](claude-code-sandbox-q06-processes.md) |
| Q7 | [审批与权限升级](claude-code-sandbox-q07-approvals.md) |
| Q8 | [密钥与控制接口](claude-code-sandbox-q08-credentials.md) |
| Q9 | [生命周期与资源限制](claude-code-sandbox-q09-lifecycle.md) |
| Q10 | [边界测试与证据](claude-code-sandbox-q10-tests.md) |
| Q11 | [综合场景分析](claude-code-sandbox-q11-scenario.md) |

原始附件 SHA-256：`d4c04308b09f22183ac449d1db809ac47c1be4acbcab90531999ae47a041aaa3`。将原始导出标题及其换行与 Q1–Q11 文件依次拼接，可恢复原始附件；不额外维护一份重复正文。

## Codex 沙箱：DeepWiki 问答

- 来源：[DeepWiki 问答页面](https://deepwiki.com/search/-agent-shell-agent-mcp_b5fc3252-d01f-417f-917d-c6c13de43aa7?mode=fast)。
- 分析对象：`openai/codex`。
- 保存日期：2026-10-10。
- 保存依据：用户提供的完整文本附件；未重新抓取网页或改写回答。
- 仓库版本／commit：导出文本未明确提供统一的版本标识，待核实；保存日期不代表源码版本。
- 内容性质：DeepWiki 生成的源码问答，非 OpenAI 官方说明。本次仅保存，未逐项核实回答中的机制判断。
- 证据限制：回答附有实现与测试代码片段，也多次说明索引上下文不完整；原文中的推断、未见证据说明与 Notes 均完整保留。

原始导出标题：`# DeepWiki Q&A with Code Context for Repository: openai/codex`

按原始 Q1–Q11 边界拆分，问题、回答、代码片段、引用和顺序均保留。`codex:行号` 为原导出的引用标记，应结合每篇 Citations 中的文件与代码片段阅读。原文的 `/wiki/...` 相对链接以 `https://deepwiki.com` 为基址，例如 [Sandboxing Implementation](https://deepwiki.com/wiki/openai/codex#5.6)。

| 原问题 | 内容 |
| --- | --- |
| Q1 | [隔离范围与组件边界](codex-sandbox-q01-boundaries.md) |
| Q2 | [命令执行调用链](codex-sandbox-q02-execution.md) |
| Q3 | [平台机制与策略转换](codex-sandbox-q03-platforms.md) |
| Q4 | [文件访问限制](codex-sandbox-q04-filesystem.md) |
| Q5 | [网络访问限制](codex-sandbox-q05-network.md) |
| Q6 | [子进程与清理](codex-sandbox-q06-processes.md) |
| Q7 | [审批与权限升级](codex-sandbox-q07-approvals.md) |
| Q8 | [密钥与控制接口](codex-sandbox-q08-credentials.md) |
| Q9 | [生命周期与资源限制](codex-sandbox-q09-lifecycle.md) |
| Q10 | [边界测试与证据](codex-sandbox-q10-tests.md) |
| Q11 | [综合场景分析](codex-sandbox-q11-scenario.md) |

原始附件 SHA-256：`63af36d5e4d2ed23ac87bda9dda05a49f5fe64de536ad76a25531a331ed84eb2`。将原始导出标题及其换行与 Q1–Q11 文件依次拼接，可恢复原始附件；不额外维护一份重复正文。
