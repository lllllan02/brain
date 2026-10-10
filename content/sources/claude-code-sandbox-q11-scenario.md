## Q11
假设 Agent 获准运行 python task.py，脚本随后读取项目外的私人文件、连接未授权站点，并启动后台子进程。请分别指出这三步由哪个组件约束、使用哪条规则、如何反馈失败；配置允许的行为请明确写“允许”，不要假定所有沙箱都会阻止。
### Answer
## 直接回答

前提：`Bash("python task.py")` 已获权限层放行——之后沙箱内的三个动作不再经过权限层，由**内核隔离 + socat 代理**约束。逐动作：

| 动作 | 约束组件 | 规则 | 结果 |
|---|---|---|---|
| 读项目外文件 | bwrap/Seatbelt 文件系统隔离 + （此前已评估的）权限层 `blockReadsOutsideWorkingDirectories` | `sandbox.filesystem.denyRead` 区域 → **拒绝**；无 denyRead 覆盖 → **允许**（沙箱不默认隐藏目录外文件） | claude-code:2387-2388  |
| 连接未授权站点 | socat 出口代理 + 域名白名单 | `sandbox.network.strictAllowlist` / per-command `allowed_domains` | 代理拒绝（如 403）；strictAllowlist 下直接拒绝不 prompt，否则转为审批提示 | claude-code:2505-2505 claude-code:973-973  |
| 启动后台子进程 | mount/PID namespace + memory cgroup | 内核级继承，无独立规则 | **允许**——后代自动落入同一沙箱，无额外拦截 | claude-code:4863-4863  |

失败反馈：违规详情写入 Bash 工具结果回传给模型——"Claude now sees which file or network access was denied and why"（曾修复详情被丢弃的 bug）。 claude-code:2388-2388 claude-code:1956-1956 

---

## 逐步说明

### 1. 读项目外私人文件

两层先后作用：

- **权限层（spawn 前，应用层）**：`permissions.blockReadsOutsideWorkingDirectories` 针对命令整体——但注意它评估的是 `python task.py` 这条命令的拼写路径，**脚本运行时内部的 `open("/etc/...")` 权限层看不到**。此层对该命令已放行后，内部文件访问不再触发逐次 prompt。 claude-code:902-902 
- **沙箱层（运行时，OS 强制）**：若路径落在 `sandbox.filesystem.denyRead` 区域内 → 内核拒绝（EACCES），且 deny 区域内可用 `allowRead` 重新开放；`denyRead: "~/.aws/"` 尾随斜杠曾可绕过（已修复）。若无 denyRead 覆盖该路径 → **允许**，脚本能读到文件。 claude-code:2387-2387 claude-code:5407-5407 

### 2. 连接未授权站点

- 由 sandbox proxy（socat 侧）按 host 白名单裁决：`strictAllowlist` 开启 → 直接拒绝、不 prompt；默认 → 拒绝详情回传并可转审批（per-command `allowed_domains` 批准仅对该命令这次运行开放）。 claude-code:2505-2505 claude-code:973-973 
- 若目标在 `allowed_domains` 或网络白名单内 → **允许**；若 `sandbox.filesystem.disabled` 类配置只关了文件系统，网络控制仍生效。 claude-code:2593-2593 
- 反馈：代理返回错误（`curl` 拿到 403 页），违规细节随 `tool_result` 回传，即使命令 exit 0 也不丢。 claude-code:1956-1956 

### 3. 启动后台子进程

**允许**，且自动继承全部沙箱边界：同一 mount ns 文件视图、同一网络白名单、同一 PID ns（scrub 开启时）和 memory cgroup——继承依据是内核 namespace/cgroup 语义，无需也不经过任何规则再评估。 claude-code:4863-4863 claude-code:2216-2216 

约束在**生命周期**而非准入：Bash 调用结束/超时/取消时 kill 整个进程树（exit 143），后台子进程无法逃脱回收——曾修复 SIGTERM 遗留孤儿树的 bug。 claude-code:2699-2699 

## Notes

- "读项目外文件"的最终判定取决于 `denyRead`/`allowRead` 实际配置——索引中无默认区域清单，沙箱默认是否拒绝任意项目外路径无法从仓库确认。
- `BashTool` 沙箱实现源码不在本仓库；上述结论均出自 CHANGELOG 与 `claude-code.d.ts` 公开面。逐行验证请开 Devin session。

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)
### Citations
**File:** CHANGELOG.md (L902-902)
```markdown
- Fixed Bash commands the permission checker cannot fully analyze skipping the prompt under `permissions.blockReadsOutsideWorkingDirectories`, and a subshell hiding a dangerous `rm` in bypass mode
```
**File:** CHANGELOG.md (L973-973)
```markdown
- Added per-command `allowed_domains` to Bash, PowerShell and Monitor in auto mode with sandboxing: the hosts a command needs are reviewed with it and opened for it alone; other hosts are refused
```
**File:** CHANGELOG.md (L1956-1956)
```markdown
- Fixed sandbox network-violation details being dropped from the Bash tool result when the blocked command still exited 0 (for example `curl` printing the proxy's 403 page)
```
**File:** CHANGELOG.md (L2216-2216)
```markdown
- Added opt-in memory cgroup support for Bash tool commands on Linux (`CLAUDE_CODE_TOOL_MEMORY_LIMIT`) so a runaway build can't stall the session
```
**File:** CHANGELOG.md (L2387-2388)
```markdown
- Fixed sandbox filesystem deny entries written with a trailing slash (e.g. `denyRead: "~/.aws/"`) being silently bypassable on Linux and macOS
- Fixed sandbox violation details never appearing in Bash tool results; Claude now sees which file or network access was denied and why
```
**File:** CHANGELOG.md (L2505-2505)
```markdown
- Added `sandbox.network.strictAllowlist` setting to deny non-allowlisted hosts for sandboxed commands without prompting
```
**File:** CHANGELOG.md (L2593-2593)
```markdown
- Added `sandbox.filesystem.disabled` setting to skip filesystem isolation while keeping network egress control
```
**File:** CHANGELOG.md (L2699-2699)
```markdown
- Fixed SIGTERM during a running Bash tool orphaning the command's process tree in print/SDK mode; the CLI now aborts the turn, kills the tree, and exits 143
```
**File:** CHANGELOG.md (L4863-4863)
```markdown
- Added subprocess sandboxing with PID namespace isolation on Linux when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set, and `CLAUDE_CODE_SCRIPT_CAPS` env var to limit per-session script invocations
```
**File:** CHANGELOG.md (L5407-5407)
```markdown
- Added `allowRead` sandbox filesystem setting to re-allow read access within `denyRead` regions
```