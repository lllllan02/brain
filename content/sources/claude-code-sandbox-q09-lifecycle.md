## Q9
沙箱按工具调用、任务、会话还是用户创建？连续两次命令共享哪些文件、进程和环境变量？CPU、内存、进程数、磁盘和运行时间分别由谁限制？创建失败、断连和取消时如何回收，哪些外部修改不会被回滚？
### Answer
## 直接回答

**沙箱按工具调用（单次命令）创建**：每条 `Bash` 命令获得独立的 mount namespace、socat 出口白名单（per-command `allowed_domains` "opened for it alone"）和进程树，命令结束即销毁。 claude-code:973-973 

**连续两次命令共享**：宿主文件系统的写入（无回滚）、会话 cwd、会话级环境变量（`$.env.set` 对"本进程及其之后启动的一切"生效）、已保存的权限规则；**不共享**进程——每条命令是独立进程树。 claude-code:3012-3015 claude-code:2699-2699 

**资源限制**：内存由 opt-in memory cgroup（`CLAUDE_CODE_TOOL_MEMORY_LIMIT`）限制；运行时间由 `timeoutMs`（默认 30 s、上限 10 min）限制；脚本调用次数由 `CLAUDE_CODE_SCRIPT_CAPS` 按会话限制；**CPU、磁盘配额在索引中无证据**。 claude-code:2216-2216 claude-code:6488-6491 claude-code:4863-4863 

**回收**：创建失败默认降级 unsandboxed 运行，`sandbox.failIfUnavailable` 改为报错退出；SIGTERM/取消时 kill 整个进程树并 exit 143；文件写入、网络副作用、worktree 等外部修改**不回滚**。 claude-code:5229-5229 claude-code:2699-2699 

---

## 生命周期粒度

| 粒度 | 证据 |
|---|---|
| **每次工具调用**（Bash/PowerShell/Monitor 各一次） | `allowed_domains` 只对"它自己那条命令"开放；每条命令独立 spawn → 独立 bwrap/Seatbelt 实例。 claude-code:973-973  |
| 会话级（非沙箱，但有作用域） | `CLAUDE_CODE_SCRIPT_CAPS` 按会话计脚本调用数；保存的 allow 规则、`additionalDirectories` 跨命令复用并即时生效。 claude-code:4863-4863 claude-code:4879-4880  |
| 任务级（子代理） | `isolation: 'worktree' | 'remote'`——worktree 隔离是 git checkout 而非内核沙箱，远程是会话级。 claude-code:432-436  |
| 用户级 | 无证据。 |

## 两次命令之间共享什么

```mermaid
graph TB
    subgraph C1["命令 1 沙箱实例"] & C2["命令 2 沙箱实例"]
        P1["独立进程树 + mount ns + 白名单"]
        P2["独立进程树 + mount ns + 白名单"]
    end
    C1 -->|"写文件 → 对命令 2 可见（同一宿主 FS 视图）"| FS["宿主文件系统"]
    FS --> C2
    Session["会话级：cwd、env、权限规则、script caps"] --> C1
    Session --> C2
```

- **文件共享**：沙箱只做"哪里能写"的隔离，不做 copy-on-write——命令 1 写到允许区域的文件，命令 2 立即看到；Bash edit-diff 的临时快照目录是会话级残留，退出时才清理。 claude-code:385-385 
- **进程不共享**：每条命令独立 spawn，无前一条命令的存活进程；后台进程是另一套 daemon 机制。 claude-code:2665-2668 
- **env 共享**：会话 env（含 `settings.json` `env`、`$.env.set`、scrub 后的集合）注入每条新命令；`TRACEPARENT` 也逐命令注入。 claude-code:5231-5231 claude-code:4866-4866 

## 资源限制分工

| 资源 | 谁限制 |
|---|---|
| 内存 | Linux memory cgroup（`CLAUDE_CODE_TOOL_MEMORY_LIMIT`，防 runaway build 拖垮会话）。 claude-code:2216-2216  |
| 运行时间 | 引擎侧 `timeoutMs` 超时后 kill（默认 30 s、上限 10 min）。 claude-code:6488-6491  |
| 进程可见性/数量 | PID namespace（scrub 开启时）；`CLAUDE_CODE_SCRIPT_CAPS` 限制脚本调用次数。 claude-code:4863-4863  |
| CPU | **无证据**——未见 cpuset/cpu cgroup 配置。 |
| 磁盘 | **无配额证据**；只有"temp 目录满导致 `claude agents` 出错"的应用层错误处理。 claude-code:520-520  |

## 回收与不可回滚的修改

- **创建失败**：默认降级为 unsandboxed 执行（`/sandbox` 对话框暴露 unsandboxed fallback 与 `excludedCommands`）；`sandbox.failIfUnavailable` 改为直接报错。 claude-code:5229-5229 claude-code:582-582 
- **取消/SIGTERM**：abort turn → kill 整树 → exit 143；PID ns 下杀 init 即由内核清整树。 claude-code:2699-2699 
- **断连**：云端会话在权限 prompt 等待期间环境关闭曾被误标 lost（已修）——说明云端有独立的会话存活/回收通道。 claude-code:2218-2218 
- **残留清理**：临时快照目录（edit-diff）、`~/.claude/session-env` 等在退出/后台清理任务中删除（曾修复误删 junction 的 bug）。 claude-code:385-385 claude-code:532-532 
- **不回滚**：沙箱无事务语义——对允许区域的文件写入、网络请求副作用、git 操作、创建的 worktree 全部保留；安全边界靠"事前 deny/allow + 落地路径判定"而非事后撤销。 claude-code:478-478 

## Notes

- `BashTool` 的 spawn/回收实现、Bash 自身默认超时（区别于 `$.process.run` 的 30 s）、CPU/磁盘配额的实现源码均不在本仓库索引；以上为 CHANGELOG 与类型声明可确认的范围，逐行确认请开 Devin session。
- "命令 1 写的内容命令 2 可见"由 mount ns 指向同一宿主 FS 的设计推得（无 overlay/snapshot 证据）；若有快照机制源码未现。

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)
### Citations
**File:** CHANGELOG.md (L385-385)
```markdown
- Fixed Bash edit-diff snapshot directories piling up in the temp folder: abandoned ones are now deleted right away and the rest when Claude Code exits
```
**File:** CHANGELOG.md (L478-478)
```markdown
- Fixed writes through a symlinked path being judged by their in-tree spelling: the prompt names where the write lands, and `acceptEdits`, allow rules and auto mode no longer approve one landing outside
```
**File:** CHANGELOG.md (L520-520)
```markdown
- Fixed `claude agents` showing a blank, unresponsive screen instead of an error when the temp directory is full, not writable or owned by another user
```
**File:** CHANGELOG.md (L532-532)
```markdown
- Windows: Fixed background cleanup deleting a directory symlink or junction used to relocate `~/.claude/session-env`, `image-cache` or another cleaned-up folder
```
**File:** CHANGELOG.md (L973-973)
```markdown
- Added per-command `allowed_domains` to Bash, PowerShell and Monitor in auto mode with sandboxing: the hosts a command needs are reviewed with it and opened for it alone; other hosts are refused
```
**File:** CHANGELOG.md (L2216-2216)
```markdown
- Added opt-in memory cgroup support for Bash tool commands on Linux (`CLAUDE_CODE_TOOL_MEMORY_LIMIT`) so a runaway build can't stall the session
```
**File:** CHANGELOG.md (L2218-2218)
```markdown
- Fixed cloud sessions occasionally being marked as lost when the environment shut down while Claude was waiting on a permission prompt
```
**File:** CHANGELOG.md (L2665-2668)
```markdown
- Fixed a displaced background daemon deleting its successor's control socket on shutdown, which made the next client kill the healthy replacement daemon
- Fixed background sessions parked with `←` or `/background` and left idle keeping the background daemon and a worker process alive indefinitely
- Fixed completed background sessions being impossible to remove via `claude rm` or the agent view once the background service had gone idle
- Fixed background sessions dispatched from a non-git folder being impossible to delete from the agents view
```
**File:** CHANGELOG.md (L2699-2699)
```markdown
- Fixed SIGTERM during a running Bash tool orphaning the command's process tree in print/SDK mode; the CLI now aborts the turn, kills the tree, and exits 143
```
**File:** CHANGELOG.md (L4863-4863)
```markdown
- Added subprocess sandboxing with PID namespace isolation on Linux when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set, and `CLAUDE_CODE_SCRIPT_CAPS` env var to limit per-session script invocations
```
**File:** CHANGELOG.md (L4866-4866)
```markdown
- Added W3C `TRACEPARENT` env var to Bash tool subprocesses when OTEL tracing is enabled, so child-process spans correctly parent to Claude Code's trace tree
```
**File:** CHANGELOG.md (L4879-4880)
```markdown
- Fixed `permissions.additionalDirectories` changes not applying mid-session — removed directories lose access immediately and added ones work without restart
- Fixed removing a directory from `additionalDirectories` revoking access to the same directory passed via `--add-dir`
```
**File:** CHANGELOG.md (L5229-5229)
```markdown
- Added `sandbox.failIfUnavailable` setting to exit with an error when sandbox is enabled but cannot start, instead of running unsandboxed
```
**File:** CHANGELOG.md (L5231-5231)
```markdown
- Added `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` to strip Anthropic and cloud provider credentials from subprocess environments (Bash tool, hooks, MCP stdio servers)
```
