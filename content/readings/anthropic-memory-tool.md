---
title: "Anthropic Memory Tool：模型提出操作，应用保存文件"
parent: agent-memory-practice
category: "Agent"
tags: ["Agent", "记忆", "工具调用"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-12T23:24:47+08:00"
source: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool"
---

**Memory Tool 是客户端执行的记忆文件操作接口。模型决定何时读写，应用负责实际存储和边界校验。** 本文节选 2026-10-12 官方文档的执行流程与接入责任，未运行 API。

请求声明 memory 工具后，模型可以提出 view、create、str_replace、insert、delete、rename。应用解析工具调用，映射到自己控制的存储，再返回 `tool_result`。`/memories` 是逻辑路径前缀，可以对应文件目录或数据库；后续会话连接同一存储，才会读取到先前内容。

典型过程是「列目录 → 读相关文件 → 完成任务 → 写回有用信息」。按需读减少初始输入，但模型可能遗漏一次必要查询；具体加载策略还需评测。

官方 Python、TypeScript SDK 提供本地文件实现；其他语言的支持范围须按文档核对，不能从工具名称推断服务端代管数据。处理器必须检查所有操作的路径，规范化后确认仍在允许目录内，仅检查字符串前缀不足以阻止越界。应用也需自行处理隔离、容量和过期。

这是自建记忆工具执行层的接口参考，与 Claude Code 内置 auto memory 是不同接入层次。[原文定位：Implement the memory handler](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool#implement-the-memory-handler)
