---
learning_status: pending
title: "Agent 记忆最小实现与源码阅读"
parent: agent-memory
category: "Agent"
tags: ["Agent", "记忆", "Go", "源码阅读"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-12T23:43:29+08:00"
type: practice
---

**一个小型跨会话偏好记忆，只需明确范围、保存记录、按需读取，并让纠正能替换旧值。** 自然语言提取可以后接模型；先把确定性的读写行为做对，才容易定位模型接入后的问题。

## 用 Go 看一次完整变化

完整程序位于 `content/assets/agent-memory-demo.go`，只依赖标准库，将当前记录存入 JSON 文件。例子固定查询属性 `example_language`：每次命令都是新进程，因此读取确实经过磁盘，而非沿用上一轮内存。

在项目根目录运行，数据使用新建的临时目录：

```sh
memory_demo_dir=$(mktemp -d)
go build -o "$memory_demo_dir/demo" content/assets/agent-memory-demo.go

# 会话 A 已确认的偏好候选，首次写入的旧版本是 0。
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json" \
  -action put -value Go -source chat-a:message-7 -version 0

# 新进程读取同一用户和项目，返回 Go、version 1。
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json"

# 会话 B 明确纠正：只有当前版本仍为 1，才能替换。
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json" \
  -action put -value Python -source chat-b:message-2 -version 1

# 返回 Python、version 2；换项目则返回 null。
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json"
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json" -project other
```

处理顺序是「加载文件 → 按 user/project/key 定位 → 核对旧版本 → 替换记录 → 写临时文件并重命名」。`get` 只返回未删除且未过期的当前记录。两处关键判断如下，变量来自完整程序：

```go
// 写入前，expected 来自调用方先前观察到的版本。
if *expected != current {
    return fmt.Errorf("stale version: expected %d, current %d", *expected, current)
}

// 读取时，范围已通过 find(rows, scope, key) 确定。
if i >= 0 && !rows[i].Deleted &&
    (rows[i].ExpiresAt == nil || time.Now().Before(*rows[i].ExpiresAt)) {
    result = &rows[i]
}
```

这里把自然语言判断的结果作为 `-value` 传入，程序不声称能从对话自动提取偏好。用户和项目参数也只是演示输入，真实服务应从认证会话绑定，不能让模型任意指定其他用户。

## 纠正、过期、删除有什么区别？

把上一条 put 的 `-version 1` 再执行一次，会因磁盘版本已是 2 而失败，避免顺序执行的旧任务覆盖新值。过期通过 `-expires` 传入 RFC3339 时间，记录仍在文件里，但普通查询不返回。

删除示例：

```sh
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json" \
  -action delete -version 2
"$memory_demo_dir/demo" -file "$memory_demo_dir/memory.json"
```

删除清空 value、source 与有效期，留下范围、key、递增版本和删除标记；查询返回 `null`。保留版本可以拒绝携带旧版本的迟到写入。它不是完整隐私删除方案：如果范围或 key 也属于删除要求，就需要另一套不保留这些值的处理；旧文件备份与外部日志也不在例子管理范围内。

此程序适用于**单写入者、顺序运行的教学演示**。版本检查与文件替换之间没有跨进程锁，两个并发写入者仍可能互相覆盖；原子重命名也不代表已经实现断电持久性。生产实现应将条件更新放进数据库事务或加锁后的临界区。

2026-10-12 在 Go 1.25.6、macOS arm64 下编译并通过独立进程检查：Go v1 写入后可读，纠正后读取 Python v2；旧版本写入被拒绝，换用户或项目返回 `null`；删除后不返回内容且 JSON 不再包含旧 value/source；到期记录不可读、未来到期记录仍可读。缺少来源和损坏 JSON 均报错，未覆盖原文件。此验证只证明这些确定性行为，不包含并发与断电测试。

## 接入模型时，增加哪两处？

写入侧让模型根据原消息提出候选，程序校验来源、范围及字段，再调用保存逻辑；候选是否确为纠正仍需明确证据。读取侧在生成回答前查询所需属性，把返回值、来源与适用范围作为背景加入输入。用户当前明确要求优先于历史默认值。

若希望模型自己选择读写时机，[[anthropic-memory-tool|Anthropic Memory Tool]]展示了文件操作工具及客户端处理器的分工；已有 SDK 应优先复用，避免再维护一套无关的 HTTP 封装。这里的 Go 示例没有调用模型、计算 embedding 或验证最终回答质量。

## 从小实现走到真实源码

[[codex-memory-pipeline|Codex 记忆源码导读]]从 `start_memories_startup_task` 进入：程序挑选旧会话并协调后台任务，Phase 1 提取，Phase 2 整合共享产物。对照小实现可以看出新增的工作：自然语言证据判断、多任务协调、版本化产物、后台延迟与失败恢复。

Codex 导读固定了源码提交并区分 V1/V2。Claude Code 的具体文件行为采用官方文档依据，不能据此臆造它的内部函数；自建文件工具的可公开核对接口由上述 Anthropic 文档承担。
