## Q4
文件读取、写入、执行权限分别如何定义和实施？项目目录之外的文件是不可见、只读，还是访问时被拒绝？请分析绝对路径、..、符号链接和挂载目录的处理，以及允许规则与拒绝规则的优先级，并寻找对应测试。
### Answer
## 直接回答

本仓库没有权限引擎的源码或测试文件（这是发布型仓库，只有 CHANGELOG、类型声明和插件）。能确认的是：**读、写、执行是三类独立权限**——读由 `permissions.blockReadsOutsideWorkingDirectories` 和 `sandbox.filesystem.denyRead`/`allowRead` 控制，写由 `Edit(...)`/`Write(...)` 规则、`sandbox.filesystem.allowWrite` 和 `sandbox.filesystem.disabled` 控制，执行由 `Bash(...)` 规则 + 命令级沙箱控制；**项目目录之外的文件默认不是不可见，而是"访问前由权限层裁决"**——沙箱内 Bash 命令则会被 OS 级隔离真正拒绝。 claude-code:5407-5407 claude-code:902-902 claude-code:2593-2593 

---

## 三类权限的定义与实施

| 权限 | 定义层 | 实施层 |
|---|---|---|
| **读** | `permissions.blockReadsOutsideWorkingDirectories`（Bash 命令的工作目录外读取需 prompt）、`sandbox.filesystem.denyRead` + `allowRead`（deny 区域内可重新开放读）、`Read(...)` 规则 | 应用层路径检查；沙箱内由 bwrap/Seatbelt 内核拒绝。 claude-code:902-902 claude-code:5407-5407  |
| **写** | `Edit(src/**)`/`Write(...)` 规则、`acceptEdits` 模式、`sandbox.filesystem.allowWrite`（绝对路径）、受保护目录 `.git`/`.claude` | 写入按**落地位置**（symlink 解析后）判定，而非拼写路径；沙箱内由 OS 强制。 claude-code:478-478 claude-code:5386-5386 claude-code:5389-5389  |
| **执行** | `Bash(cmd:*)` allow/deny/ask 规则、`sandbox.excludedCommands`、`autoAllowBashIfSandboxed` | 放行后经 bwrap/Seatbelt spawn；`deny` 规则对管道混合 `cd` 的命令也不可降级为 prompt。 claude-code:4881-4882 claude-code:5602-5602  |

## 目录外文件：拒绝，而非不可见

- `permissions.blockReadsOutsideWorkingDirectories` 的语义是**读取前触发权限检查/prompt**——文件仍然可见可 stat，只是被拦截；曾修复无法分析的 Bash 命令（`cd` 链、subshell）绕过该检查的漏洞。 claude-code:989-989 
- 插件侧 `$.fs` 文档证实："An absolute path is used as given; where one may go is an `fs.*` hook's to say"——绝对路径按原样使用，**是否放行由 hook 决定**，即默认是"访问时被拒绝/裁决"模型。 claude-code:2719-2724 
- 沙箱维度相反：`denyRead`/`allowRead`/`allowWrite` 是 OS 级区域配置，沙箱内进程真正无法触及。 claude-code:5407-5407 
- `additionalDirectories`/`--add-dir` 可扩大工作目录集，且改动即时生效。 claude-code:4879-4880 

## 路径形态处理

- **绝对路径**：按原样接受（`$.fs`）；`allowWrite` 支持绝对路径（曾需 `//` 前缀的 bug 已修）。 claude-code:5386-5386 
- **`..` 与相对路径**：`FsStat.realPath` 的语义是"绝对、每个符号链接已跟随、`.` 和 `..` 已折叠"——即权限裁决应基于解析后的 `realPath`；官方注释明确"deny-list on spellings is best effort; an allow-list on `realPath` under a root resolved the same way is the robust guard"。 claude-code:4108-4117 
- **符号链接**：写入按落地路径判定（`acceptEdits`、allow 规则、auto mode 不再批准落到树外的写入）；deny/ask 规则同时匹配 symlink 拼写和真实位置（`/etc`、`/tmp`、`/var` on macOS、`/bin` on Linux 的修复）；macOS 上还修过"symlink resolution changed after permission was checked"的 TOCTOU 拒绝。 claude-code:478-478 claude-code:1186-1187 claude-code:910-910 
- **挂载/网络位置**："a foreign network location as spelled rejects untouched"——`\\`/`//` UNC、驱动器相对 `D:x`、设备路径在拼写阶段即判 unplaceable，不产生文件系统调用；Windows 另有 `\??\` 前缀绕过 UNC 校验的修复。 claude-code:2793-2804 claude-code:2224-2224 

## 允许 vs 拒绝的优先级

- **deny 优先于 hook 的 allow**：PreToolUse hook 返回 `"allow"` 不能再绕过 `deny` 规则（含 enterprise managed settings）——明确的 deny > allow 证据。 claude-code:5412-5412 
- **区域嵌套**：`allowRead` 是在 `denyRead` 区域内重新开放读，即读路径上 allow 可以在 deny 范围内打洞；写路径未提供对称机制（`allowWrite` 是全局允许列表）。 claude-code:5407-5407 
- **managed settings 失效保护**：managed `sandbox` 块中单个非法值 fail-closed，其余仍生效；managed allow 被管理员移除后立即停用。 claude-code:147-147 claude-code:4878-4878 

## 测试

**本仓库没有权限/沙箱的测试文件**——索引中只有 `CHANGELOG.md`、`mods/types/claude-code.d.ts`、插件（`plugins/security-guidance/hooks/security_reminder_hook.py` 等）和 `.devcontainer`。CHANGELOG 中的每条"Fixed … bypass"条目隐含了上游私有仓库中的回归测试场景（如 symlink 落地判定、`\??\` 前缀、`env -C`/`eval` 行内绕过），但测试源码本身不在此。 claude-code:1186-1187 claude-code:921-921 

## Notes
- `$.fs`（插件 API）与内置 `Read`/`Write`/`Edit` 工具是两套机制：`$.fs` 由 `fs.*` hooks 裁决，内置工具由 permission rules 裁决；上面 `placed()` 示例是官方给出的"如何自己写目录外守卫"的参考实现。 claude-code:2790-2817 
- 如需逐行的规则匹配顺序（deny→ask→allow 的具体求值代码）和真实测试，需开 Devin session 访问完整实现源码。

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)
### Citations
**File:** CHANGELOG.md (L147-147)
```markdown
- Fixed managed `sandbox` settings being ignored entirely when one nested value was invalid; the invalid value now fails closed and the rest of the block still applies
```
**File:** CHANGELOG.md (L478-478)
```markdown
- Fixed writes through a symlinked path being judged by their in-tree spelling: the prompt names where the write lands, and `acceptEdits`, allow rules and auto mode no longer approve one landing outside
```
**File:** CHANGELOG.md (L902-902)
```markdown
- Fixed Bash commands the permission checker cannot fully analyze skipping the prompt under `permissions.blockReadsOutsideWorkingDirectories`, and a subshell hiding a dangerous `rm` in bypass mode
```
**File:** CHANGELOG.md (L910-910)
```markdown
- Fixed Read on macOS refusing a dragged-in screenshot, or any file the system reports under a second path, with "symlink resolution changed after permission was checked"
```
**File:** CHANGELOG.md (L921-921)
```markdown
- Reverted a 2.1.268 change that checked Read and Edit deny rules on Bash lines the permission checker can't analyze (`eval`, `env -C`); commands like `time -p make build` prompt again instead of being denied
```
**File:** CHANGELOG.md (L989-989)
```markdown
- Fixed Bash commands with two directory changes, a subshell, or a `cd`+`git` chain skipping the prompt under `permissions.blockReadsOutsideWorkingDirectories` in bypass and auto mode
```
**File:** CHANGELOG.md (L1186-1187)
```markdown
- Fixed deny and ask permission rules on symlinked directories (`/etc`, `/tmp`, `/var` on macOS; `/bin` on Linux) not applying when a path was given by its real location, and Bash commands ignoring deny rules written on a symlinked path spelling
- Fixed a case where a Read or Edit deny rule did not apply when an `env -C`, `eval` or similar command the permission checker cannot analyze was on the same line
```
**File:** CHANGELOG.md (L2224-2224)
```markdown
- Fixed Windows paths spelled with the NT `\??\` device prefix bypassing UNC path validation, closing an NTLM credential-leak vector
```
**File:** CHANGELOG.md (L2593-2593)
```markdown
- Added `sandbox.filesystem.disabled` setting to skip filesystem isolation while keeping network egress control
```
**File:** CHANGELOG.md (L4878-4878)
```markdown
- Fixed managed-settings allow rules remaining active after an admin removed them, until process restart
```
**File:** CHANGELOG.md (L4879-4880)
```markdown
- Fixed `permissions.additionalDirectories` changes not applying mid-session — removed directories lose access immediately and added ones work without restart
- Fixed removing a directory from `additionalDirectories` revoking access to the same directory passed via `--add-dir`
```
**File:** CHANGELOG.md (L4881-4882)
```markdown
- Fixed `Bash(cmd:*)` and `Bash(git commit *)` wildcard permission rules failing to match commands with extra spaces or tabs
- Fixed `Bash(...)` deny rules being downgraded to a prompt for piped commands that mix `cd` with other segments
```
**File:** CHANGELOG.md (L5386-5386)
```markdown
- Fixed `sandbox.filesystem.allowWrite` not working with absolute paths (previously required `//` prefix)
```
**File:** CHANGELOG.md (L5389-5389)
```markdown
- Fixed `.git`, `.claude`, and other protected directories being writable without a prompt in `bypassPermissions` mode
```
**File:** CHANGELOG.md (L5407-5407)
```markdown
- Added `allowRead` sandbox filesystem setting to re-allow read access within `denyRead` regions
```
**File:** CHANGELOG.md (L5412-5412)
```markdown
- Fixed PreToolUse hooks returning `"allow"` bypassing `deny` permission rules, including enterprise managed settings
```
**File:** CHANGELOG.md (L5602-5602)
```markdown
- Fixed several permission rule matching issues: wildcard rules not matching commands with heredocs, embedded newlines, or no arguments; `sandbox.excludedCommands` failing with env var prefixes; "always allow" suggesting overly broad prefixes for nested CLI tools; and deny rules not applying to all command forms
```
**File:** mods/types/claude-code.d.ts (L2719-2724)
```typescript
       * The file system as the engine's own process reaches it; a relative path
       * is under the session's working directory, and text is UTF-8.
       *
       * An absolute path is used as given; where one may go is an `fs.*` hook's
       * to say. A read or write over 4 MiB rejects, a foreign network location
       * as spelled rejects untouched, and an OS refusal rejects with its errno.
```
**File:** mods/types/claude-code.d.ts (L2790-2817)
```typescript
           * @example
           * // a Write may name a file not there yet: `placed` answers where the
           * // path lands or undefined, and the guard denies on undefined or
           * // outside ROOT. Unplaceable by spelling first, with no file system
           * // call (drive-relative `D:x`, a `\\` or `//` network or device path,
           * // a name that is empty, ".", ".." or itself `C:...`); then the file
           * // if it stats; else its folder, cut after the last separator and
           * // keeping it so a drive or share root stays that root, plus the name
           * const placed = async (path) => {
           *   const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))
           *   const name = path.slice(cut + 1)
           *   const isPlaceable = !/^[A-Za-z]:(?![\\/])/.test(path) &&
           *     !/^[\\/][\\/]/.test(path) && !/^[A-Za-z]:/.test(name) &&
           *     name !== "" && name !== "." && name !== ".."
           *   if (!isPlaceable) return undefined
           *   const own = await $.fs.stat(path, { resolve: true })
           *     .catch(() => undefined)
           *   if (own) return own.realPath
           *   const folder = cut < 0 ? "." : path.slice(0, cut + 1)
           *   const dir = await $.fs.stat(folder, { resolve: true })
           *     .catch(() => undefined)
           *   return dir?.realPath === undefined ? undefined
           *     : `${dir.realPath.replace(/[\\/]$/, "")}${SEP}${name}`
           * }
           * const real = await placed(e.file_path)
           * const isInside = real !== undefined && real.startsWith(ROOT + SEP)
           * return isInside ? next(e) : { deny: "cannot place it, or outside" }
           */
```
**File:** mods/types/claude-code.d.ts (L4108-4117)
```typescript
      /**
       * Where the path landed when asked with `{ resolve: true }`: absolute,
       * every symbolic link followed, `.` and `..` folded; else absent.
       *
       * Absent too when the path leads nowhere or a hook above withheld it, so
       * a guard denies without it; and a hard link, a volume or file-id spelling
       * (macOS `/.vol/`) or a case alias keeps its own spelling, `isLink` false.
       *
       * @remarks a deny-list on spellings is thus best effort; an allow-list on
       *          `realPath` under a root resolved the same way is the robust guard.
```
