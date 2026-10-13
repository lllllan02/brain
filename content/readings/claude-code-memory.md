---
title: "Claude Code：规则文件与自动记忆索引"
parent: agent-memory-retrieval
category: "Agent"
tags: ["Agent", "记忆", "按需加载"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: "https://code.claude.com/docs/en/memory"
read: true
---

**「Claude Code 把人工维护的项目指令与自动积累的记忆分开，自动记忆再通过短索引找到详细主题文件。」** 本文节选 2026-10-12 官方 memory 文档；依据产品说明，未将其当作完整公开源码分析。

`CLAUDE.md` 承载明确规则；auto memory 保存用户信息、反馈、项目背景及资料位置。文档强调未来复用价值，并避免重复记录可从代码或既有指令直接获得的信息。

默认记忆位于 `~/.claude/projects/<project>/memory/`，同仓库的 worktree 共享。启动时加载 `MEMORY.md` 的前 200 行或 25 KB，以先到者为限；细节留在主题文件，执行中再读取。索引超过限制仍可能写入成功，却在下次加载时被截断，因此「文件存在」不足以证明信息已进入上下文。

`/memory` 可查看与管理；文件保留和会话日志清理采用不同规则。记忆默认在本机，不能由目录持久化推断跨机器同步。

从这套设计可借鉴**「少量常驻入口＋按需读细节」**。指令和记忆仍是模型输入，要求稳定阻断某类操作时，需要程序或 Hook 执行约束。[原文定位：Auto memory](https://code.claude.com/docs/en/memory#auto-memory)
