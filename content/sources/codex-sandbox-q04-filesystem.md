## Q4
文件读取、写入、执行权限分别如何定义和实施？项目目录之外的文件是不可见、只读，还是访问时被拒绝？请分析绝对路径、..、符号链接和挂载目录的处理，以及允许规则与拒绝规则的优先级，并寻找对应测试。
### Answer
权限模型定义在 `FileSystemSandboxPolicy`：一组 `FileSystemSandboxEntry{path, access}`，`access` 取 `FileSystemAccessMode::{Read, Write, Deny}`；`path` 可以是具体绝对路径、`GlobPattern` 或 `FileSystemSpecialPath::{Root, Tmpdir, Minimal}` 等 codex:44-52 。**执行权限没有单独条目**——能读到的文件才可执行，执行隔离由挂载视图/Seccomp/令牌整体承担。**项目目录之外**的行为依策略而定：`WorkspaceWrite` 默认全磁盘可读但只项目目录可写；受限策略把未授权路径变为**不可见**（bwrap 遮蔽挂载）或只读绑定，而非运行时才报错 codex:53-60 。

---

## 权限定义与实施

### 三种访问模式

`FileSystemSandboxEntry::new(path, access)` 构建规则条目；`access` 为 `Read`/`Write`/`Deny`（测试中 `deny_glob` 即 `Deny` + glob） codex:40-47 。策略在 `transform` 时由 `effective_permission_profile` 归一化后交给各后端 codex:115-143 。

### 目录外文件的三种结局（按后端）

| 后端 | 未授权路径的表现 | 机制 |
|---|---|---|
| Linux bwrap | **不可见**（遮蔽挂载）或**只读**（`--ro-bind`）；写入报 `EROFS`，访问被拒 | `--ro-bind / /` 整体只读，`--bind` 叠加可写根，受保护子路径再 `--ro-bind`，不可读 glob 用挂载遮蔽 codex:53-68  |
| macOS Seatbelt | 可写根内可写；`.git`/`.codex`/`gitdir:` 目标强制只读；其余按 profile 默认规则 | SBPL 编译进 `sandbox-exec -p` codex:27-35  |
| Windows | deny ACE / capability SID ACL 使访问在 OS 层被拒；非 elevated 后端无法执行 deny-read 时**拒绝启动**而非降级 | codex:744-753  |

## 路径处理

- **绝对路径**：策略条目以 `sandbox_policy_cwd` 为基准展开；exec-server 中 `native_sandbox_cwd` / `native_workspace_root` 把 `PathUri` 转原生绝对路径，非本机约定直接报错 codex:222-233 。
- **`..` / 相对路径**：cwd 相对的 deny glob 在 helper 移目录前先绑定到 `cwd`——`bind_windows_cwd_relative_deny_read_globs` 把 `secret*` 这类模式解析为 `<cwd>/secret*` codex:274-299 ；测试 `executor_legacy_exec_uses_process_cwd_for_relative_denials` 验证 `secret*` 相对进程 cwd 生效 codex:653-676 。
- **符号链接**：`normalize_file_system_policy_root_aliases`（非 Linux 上在 transform 前做；Linux 由 helper 内解析，避免在执行线程同步探测无关根）把软链接根解析为真实路径再施加规则 codex:131-136 。
- **挂载目录**：`mask_wsl_interop` / `mask_wslg_distro` 遮蔽 `/run/WSL` 互操作套接字与 WSLg 重复根，防止经挂载绕过文件系统视图；若 `mask_wslg_distro` 激活还会校验可执行文件路径能跨遮蔽访问 codex:305-330 。
- **保留路径**：`.git`（目录或指针文件）、解析后的 `gitdir:` 目标、`.codex` 在 writable 父目录下仍保持只读（macOS 说明） codex:27-29 。

## 允许 vs 拒绝的优先级

按**路径特异性**排序，而非简单 "deny 优先"：更窄的可写子路径可以在更广的 deny 父路径下重新打开；更窄的 deny 也能盖过更广的 allow。README 给的例子：`/repo=write, /repo/a=none, /repo/a/b=write` → `/repo` 可写、`/repo/a` 拒绝、`/repo/a/b` 可写 codex:60-68 。这种 split 策略无法回退到 legacy Landlock 模型，强制走 bwrap；Windows 上若后端无法直接执行则 fail closed codex:44-50 codex:87-92 。

辅助路径例外：文件系统受限时会自动注入 `FileSystemSpecialPath::Minimal` 读条目和 helper 可执行文件的读权限，保证沙箱 helper 自身可启动 codex:245-272 。

## 对应测试

- `codex-rs/linux-sandbox/tests/suite/sandbox.rs`：端到端文件系统隔离 + syscall 过滤套件（经 `process_exec_tool_call` + `PermissionProfile`） codex:1-20 
- `tests/suite/denied_files_tests.rs` / `root_metadata_tests.rs`：denied 路径与根元数据保护（见 wiki 所列文件）
- `process_sandbox_tests.rs::sandbox_request_wraps_native_argv_on_executor`：验证 `--permission-profile` JSON 与 `--sandbox-policy-cwd`/`--command-cwd` 分离传入 wrapper codex:68-111 
- `exec_tests.rs::build_exec_request_projects_workspace_roots_only_for_windows_sandbox`：外族路径（foreign drive URI）作为 workspace root 被原生 Windows 沙箱拒绝 codex:1206-1251 
- `core/tests/windows_sandbox.rs`：deny-read/deny-write/readonly/allowed 文件矩阵在 direct-spawn 与 `process_exec_tool_call` 两路下验证 codex:477-500 
- `capability_discovery.rs`：cwd 相对 deny glob 的实际执行验证（见上）
- `sandbox_integrity/AGENTS.md`：完整性检查目前只发遥测，"honor the basic read/write/deny rules"，明确 glob/symlink 细微差异是已知近似 codex:24-31 

## Notes

- 文件工具（fs RPC）与 shell 命令走同一 `FileSystemSandboxPolicy` → `transform_for_direct_spawn` 链路，helper 进程在沙箱内做实际 open/read/write codex:84-94 。
- `sandbox_integrity` 检查是遥测性质，不改变执行；真正的强制在 mount/ACL/Seatbelt 层。
- 索引未含 `seatbelt.rs` 的 SBPL 生成细节与 `bwrap.rs` 的完整 argv 构建；如需逐条规则可开 Devin 会话查看。

Wiki pages you might want to explore:
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
- [Exec Server (openai/codex)](/wiki/openai/codex#4.7)

Wiki pages you might want to explore:
- [Exec Server (openai/codex)](/wiki/openai/codex#4.7)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
### Citations
**File:** codex-rs/exec-server/tests/file_system_unix.rs (L44-52)
```rust
use codex_exec_server::WalkOutcome;
use codex_exec_server::WriteFileOptions;
use codex_protocol::models::PermissionProfile;
use codex_protocol::permissions::FileSystemAccessMode;
use codex_protocol::permissions::FileSystemPath;
use codex_protocol::permissions::FileSystemSandboxEntry;
use codex_protocol::permissions::FileSystemSandboxPolicy;
use codex_protocol::permissions::FileSystemSpecialPath;
use codex_protocol::permissions::NetworkSandboxPolicy;
```
**File:** codex-rs/linux-sandbox/README.md (L53-68)
```markdown
- When bubblewrap is active, the helper applies `PR_SET_NO_NEW_PRIVS` and a
  seccomp filter in-process after establishing the filesystem view. Restricted
  network policies block network syscalls; filesystem-restricted policies with
  otherwise unrestricted networking still block `AF_VSOCK` sockets. All filter
  modes block `io_uring` to prevent bypassing socket-family restrictions.
- When bubblewrap is active, the filesystem is read-only by default via `--ro-bind / /`.
- When bubblewrap is active, writable roots are layered with `--bind <root> <root>`.
- When bubblewrap is active, protected subpaths under writable roots (for
  example `.git`,
  resolved `gitdir:`, and `.codex`) are re-applied as read-only via `--ro-bind`.
- When bubblewrap is active, overlapping split-policy
  entries are applied in path-specificity order so narrower writable children
  can reopen broader read-only or denied parents while narrower denied subpaths
  still win. For example, `/repo = write`, `/repo/a = none`, `/repo/a/b = write`
  keeps `/repo` writable, denies `/repo/a`, and reopens `/repo/a/b` as
  writable again.
```
**File:** codex-rs/exec-server/src/sandbox_integrity/backend_tests.rs (L40-47)
```rust
pub(super) fn deny_glob(pattern: impl Into<String>) -> FileSystemSandboxEntry {
    FileSystemSandboxEntry::new(
        FileSystemPath::GlobPattern {
            pattern: pattern.into(),
        },
        FileSystemAccessMode::Deny,
    )
}
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L84-94)
```rust
    #[tracing::instrument(name = "fs.sandbox_request", skip_all)]
    pub(crate) async fn run(
        &self,
        sandbox: &FileSystemSandboxContext,
        request: FsHelperRequest,
    ) -> Result<FsHelperPayload, JSONRPCErrorError> {
        let command = self.sandbox_command(sandbox)?;
        crate::run_integrity_checks(&command).await;
        let request_json = serde_json::to_vec(&request).map_err(json_error)?;
        run_command(command, request_json).await
    }
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L115-143)
```rust
        let native_permissions = sandbox
            .permissions
            .clone()
            .materialize_project_roots_with_workspace_roots(workspace_roots);
        let mut file_system_policy = native_permissions.file_system_sandbox_policy();
        tracing::Span::current().record("permission_entries", file_system_policy.entries.len());
        let helper_read_roots = if sandbox.use_legacy_landlock {
            Vec::new()
        } else {
            helper_read_roots(&self.runtime_paths)
        };
        add_helper_runtime_permissions(
            &mut file_system_policy,
            &helper_read_roots,
            cwd.native.as_path(),
        );
        // Linux resolves aliases in the sandbox helper. Doing it here also probes
        // unrelated permission roots synchronously on the executor's runtime thread.
        #[cfg(not(target_os = "linux"))]
        normalize_file_system_policy_root_aliases(&mut file_system_policy)?;
        #[cfg(windows)]
        bind_windows_cwd_relative_deny_read_globs(&mut file_system_policy, &cwd.uri)?;
        let network_policy = NetworkSandboxPolicy::Restricted;
        let permission_profile = PermissionProfile::from_runtime_permissions_with_enforcement(
            native_permissions.enforcement(),
            &file_system_policy,
            network_policy,
        );
        self.sandbox_exec_request(&permission_profile, &cwd, workspace_roots, sandbox)
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L222-233)
```rust
fn native_sandbox_cwd(cwd: &PathUri) -> Result<AbsolutePathBuf, JSONRPCErrorError> {
    cwd.to_abs_path()
        .map_err(|err| invalid_request(err.to_string()))
}

fn native_workspace_root(root: &PathUri) -> Result<AbsolutePathBuf, JSONRPCErrorError> {
    root.to_abs_path().map_err(|err| {
        invalid_request(format!(
            "file system sandbox workspace root is not native to this exec-server host: {err}"
        ))
    })
}
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L245-272)
```rust
fn add_helper_runtime_permissions(
    file_system_policy: &mut FileSystemSandboxPolicy,
    helper_read_roots: &[AbsolutePathBuf],
    cwd: &std::path::Path,
) {
    if !file_system_policy.has_full_disk_read_access() {
        let minimal_read_entry = FileSystemSandboxEntry::new(
            FileSystemPath::Special {
                value: FileSystemSpecialPath::Minimal,
            },
            FileSystemAccessMode::Read,
        );
        if !file_system_policy.entries.contains(&minimal_read_entry) {
            file_system_policy.entries.push(minimal_read_entry);
        }
    }

    for helper_read_root in helper_read_roots {
        if file_system_policy.can_read_local_path_with_cwd(helper_read_root.as_path(), cwd) {
            continue;
        }

        file_system_policy.entries.push(FileSystemSandboxEntry::new(
            helper_read_root.clone().into(),
            FileSystemAccessMode::Read,
        ));
    }
}
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L274-299)
```rust
#[cfg(any(windows, test))]
fn bind_windows_cwd_relative_deny_read_globs(
    file_system_policy: &mut FileSystemSandboxPolicy,
    cwd: &PathUri,
) -> Result<(), JSONRPCErrorError> {
    // The Windows direct-spawn wrapper reevaluates the profile using the helper cwd.
    // Bind cwd-relative denials before moving the helper to the filesystem root.
    for entry in &mut file_system_policy.entries {
        if let FileSystemPath::GlobPattern { pattern } = &mut entry.path
            && entry.access == FileSystemAccessMode::Deny
            && PathConvention::Windows
                .home_relative_suffix(pattern)
                .is_none()
            && LegacyAppPathString::from_string(pattern.as_str())
                .to_path_uri(PathConvention::Windows)
                .is_err()
        {
            cwd.validate_glob_directory(PathConvention::Windows)
                .map_err(|err| invalid_request(err.to_string()))?;
            *pattern = cwd
                .join(pattern.as_str())
                .map_err(|err| invalid_request(err.to_string()))?
                .inferred_native_path_string();
        }
    }
    Ok(())
```
**File:** codex-rs/core/README.md (L27-35)
```markdown
When using the workspace-write sandbox policy, the Seatbelt profile allows
writes under the configured writable roots while keeping `.git` (directory or
pointer file), the resolved `gitdir:` target, and `.codex` read-only.

Network access and filesystem read/write roots are controlled by
`SandboxPolicy`. Seatbelt consumes the resolved policy and enforces it.

Seatbelt also keeps the legacy default preferences read access
(`user-preference-read`) needed for cfprefs-backed macOS behavior.
```
**File:** codex-rs/core/README.md (L44-50)
```markdown
Split filesystem policies that need direct `FileSystemSandboxPolicy`
enforcement, such as read-only or denied carveouts under a broader writable
root, automatically route through bubblewrap. The legacy Landlock path is used
only when the split filesystem policy round-trips through the legacy
`SandboxPolicy` model without changing semantics. That includes overlapping
cases like `/repo = write`, `/repo/a = none`, `/repo/a/b = write`, where the
more specific writable child must reopen under a denied parent.
```
**File:** codex-rs/core/README.md (L87-92)
```markdown
New `[permissions]` / split filesystem policies remain supported on Windows
only when they can be enforced directly by the selected Windows backend or
round-trip through the legacy `SandboxPolicy` model without changing semantics.
Policies that would require direct explicit unreadable carveouts (`none`) or
reopened writable descendants under read-only carveouts still fail closed
instead of running with weaker enforcement.
```
**File:** codex-rs/windows-sandbox-rs/src/lib.rs (L744-753)
```rust
        if !permissions.has_full_disk_read_access() {
            anyhow::bail!(
                "Restricted read-only access requires the elevated Windows sandbox backend"
            );
        }
        // WRITE_RESTRICTED tokens consult restricting SIDs only for writes, so this
        // backend cannot make capability-SID deny-read ACLs authoritative.
        if !additional_deny_read_paths.is_empty() {
            anyhow::bail!("deny-read overrides require the elevated Windows sandbox backend");
        }
```
**File:** codex-rs/exec-server/tests/capability_discovery.rs (L653-676)
```rust
#[cfg(unix)]
#[tokio::test]
async fn executor_legacy_exec_uses_process_cwd_for_relative_denials() -> anyhow::Result<()> {
    let workspace = tempfile::tempdir()?;
    std::fs::write(workspace.path().join("allowed.txt"), b"allowed")?;
    std::fs::write(workspace.path().join("secret.txt"), b"secret")?;
    let cwd = PathUri::from_host_native_path(workspace.path())?;
    let policy = FileSystemSandboxPolicy::restricted(vec![
        FileSystemSandboxEntry::new(
            FileSystemPath::Special {
                value: FileSystemSpecialPath::Root,
            },
            FileSystemAccessMode::Read,
        ),
        FileSystemSandboxEntry::new(
            FileSystemPath::GlobPattern {
                pattern: "secret*".to_string(),
            },
            FileSystemAccessMode::Deny,
        ),
    ]);
    let sandbox = FileSystemSandboxContext::from_permission_profile(
        PermissionProfile::from_runtime_permissions(&policy, NetworkSandboxPolicy::Restricted),
        cwd.clone(),
```
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L305-330)
```rust
        let options = BwrapOptions {
            mount_proc: !no_proc && !inherit_pid_namespace,
            inherit_pid_namespace,
            network_mode: bwrap_network_mode(network_sandbox_policy, allow_network_for_proxy),
            mask_wsl_interop: !file_system_sandbox_policy.has_full_disk_write_access()
                && Path::new(WSL_INTEROP_DIR).is_dir(),
            mask_wslg_distro: (!file_system_sandbox_policy.has_full_disk_write_access()
                || !file_system_sandbox_policy
                    .get_unreadable_globs_with_cwd(&sandbox_policy_cwd)
                    .is_empty())
                && crate::wslg::is_duplicate_root(Path::new(WSLG_DISTRO_ROOT))
                    .unwrap_or_else(|err| exit_with_bwrap_build_error(err.into())),
            ..Default::default()
        };
        if options.mask_wslg_distro
            && let Some(executable) = command
                .first()
                .filter(|executable| executable.contains('/'))
        {
            let executable = command_cwd
                .as_deref()
                .unwrap_or(&sandbox_policy_cwd)
                .join(executable);
            crate::wslg::ensure_supported_path(&executable)
                .unwrap_or_else(|err| exit_with_bwrap_build_error(err));
        }
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L1-20)
```rust
//! End-to-end Linux sandbox coverage for filesystem isolation and syscall filtering.

#![cfg(target_os = "linux")]
#![allow(clippy::unwrap_used)]
use codex_core::exec::ExecCapturePolicy;
use codex_core::exec::ExecParams;
use codex_core::exec::process_exec_tool_call;
use codex_core::exec_env::create_env;
use codex_core::sandboxing::SandboxPermissions;
use codex_protocol::config_types::ShellEnvironmentPolicy;
use codex_protocol::config_types::WindowsSandboxLevel;
use codex_protocol::error::CodexErrorDetails;
use codex_protocol::error::Result;
use codex_protocol::error::SandboxErr;
use codex_protocol::models::PermissionProfile;
use codex_protocol::permissions::FileSystemAccessMode;
use codex_protocol::permissions::FileSystemPath;
use codex_protocol::permissions::FileSystemSandboxEntry;
use codex_protocol::permissions::FileSystemSandboxPolicy;
use codex_protocol::permissions::FileSystemSpecialPath;
```
**File:** codex-rs/exec-server/src/process_sandbox_tests.rs (L68-111)
```rust
#[tokio::test]
async fn sandbox_request_wraps_native_argv_on_executor() {
    let command_directory = tempdir().expect("command directory");
    let cwd = AbsolutePathBuf::from_absolute_path(command_directory.path()).expect("absolute cwd");
    let cwd_uri = PathUri::from_abs_path(&cwd);
    let self_exe = std::env::current_exe().expect("current executable");
    let runtime_paths =
        ExecServerRuntimeOptions::new(self_exe.clone(), Some(self_exe)).expect("runtime paths");
    let sandbox = FileSystemSandboxContext::from_permission_profile(
        PermissionProfile::workspace_write(),
        cwd_uri.clone(),
    );
    let params = ExecParams {
        metadata: Default::default(),
        process_id: ProcessId::from("process-1"),
        argv: vec![
            "/bin/bash".to_string(),
            "-lc".to_string(),
            "pwd".to_string(),
        ],
        cwd: cwd_uri,
        shell_snapshot: None,
        env_policy: None,
        env: HashMap::new(),
        tty: false,
        pipe_stdin: false,
        arg0: None,
        sandbox: Some(sandbox),
        enforce_managed_network: false,
        managed_network: None,
        network_proxy: None,
    };

    let prepared = prepare_exec_request(
        &params,
        HashMap::new(),
        Some(&runtime_paths),
        /*network_policy_decider*/ None,
        /*network_policy_audit_observer*/ None,
    )
    .await
    .expect("prepare sandboxed request");

    assert_ne!(prepared.command, params.argv);
```
**File:** codex-rs/core/src/exec_tests.rs (L1206-1251)
```rust
#[tokio::test]
async fn build_exec_request_projects_workspace_roots_only_for_windows_sandbox() -> Result<()> {
    let temp_dir = tempfile::TempDir::new()?;
    let cwd = temp_dir.path().abs();
    let build_request = async |profile: &PermissionProfile, roots: &[PathUri]| {
        build_exec_request(
            ExecParams {
                command: vec!["echo".to_string(), "ok".to_string()],
                cwd: cwd.clone(),
                expiration: ExecExpiration::DefaultTimeout,
                capture_policy: ExecCapturePolicy::ShellTool,
                env: HashMap::new(),
                network: None,
                network_environment_id: None,
                sandbox_permissions: SandboxPermissions::UseDefault,
                windows_sandbox_level: WindowsSandboxLevel::RestrictedToken,
                justification: None,
                arg0: None,
            },
            profile,
            &cwd,
            roots,
            &Some(temp_dir.path().join("codex-linux-sandbox")),
            /*codex_self_exe*/ &None,
            SandboxType::WindowsRestrictedToken,
            /*use_legacy_landlock*/ false,
        )
        .await
    };
    let native_roots = vec![cwd.clone(), temp_dir.path().join("additional").abs()];
    let request = build_request(
        &PermissionProfile::read_only(),
        &native_roots
            .iter()
            .map(PathUri::from_abs_path)
            .collect::<Vec<_>>(),
    )
    .await?;
    assert_eq!(
        request.windows_sandbox_workspace_roots,
        if cfg!(windows) {
            native_roots
        } else {
            Vec::new()
        },
    );
```
**File:** codex-rs/core/tests/windows_sandbox.rs (L477-500)
```rust
    for direct_spawn in [false, true] {
        // As in the deny-read test below, put quoted paths in the environment
        // rather than in cmd /C's argument: the Win32 argv encoder escapes
        // literal argument quotes for CRT parsing, which cmd does not use.
        let mut env: HashMap<String, String> = [
            ("ALLOWED_FILE", temp.join("allowed.txt")),
            ("OTHER_FILE", other.join("wrong.txt")),
            ("PUBLIC_FILE", read_only.join("public.txt")),
            ("READONLY_FILE", read_only.join("wrong.txt")),
            ("SECRET_FILE", denied.join("secret.txt")),
            ("DENIED_FILE", denied.join("wrong.txt")),
        ]
        .into_iter()
        .map(|(name, path)| (name.to_string(), format!("\"{}\"", path.display())))
        .collect();
        let child_var = if direct_spawn {
            env.insert("tMp".to_string(), temp.to_string_lossy().into_owned());
            "%TMP%"
        } else {
            env.insert("Temp".to_string(), other.to_string_lossy().into_owned());
            env.insert("TEMP".to_string(), temp.to_string_lossy().into_owned());
            "%TEMP%"
        };
        let command = format!("echo CHILD-TEMP:{child_var} & {command}");
```
**File:** codex-rs/exec-server/src/sandbox_integrity/AGENTS.md (L24-31)
```markdown
## Deliberate approximation

Honor the basic read/write/deny rules. Do not reconstruct native enforcement or
audit OS ACLs. Additional backend protections can produce false positives;
additional write grants (such as Seatbelt scratch access) can produce false
negatives. Backend glob/symlink nuances and writable hard-link aliases are not
fully modeled. The separate glob scan can differ from enforcement's snapshot.
Metrics describe observed checker outcomes, not accuracy or missed violations.
```
