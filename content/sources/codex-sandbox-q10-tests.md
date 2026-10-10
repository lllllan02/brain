## Q10
请找出验证沙箱边界的集成测试：越界文件访问、禁止联网、子进程继承、资源超限、失败清理。哪些测试真正启动受限进程，哪些只检查生成的配置？哪些安全属性在本仓库中没有验证证据？
### Answer
**简答**：仓库里最强的沙箱边界验证集中在 `codex-rs/linux-sandbox/tests/suite/`——这些测试通过 `process_exec_tool_call` 或直接调 `codex-linux-sandbox` helper **真实启动受限进程**，覆盖越界文件访问、禁止联网、能力断言和超时清理；Windows 侧 `core/tests/windows_sandbox.rs` 走真实 elevated runner。相反，`process_sandbox_tests.rs`、`seatbelt_tests.rs`、`bwrap_tests.rs` 只验证**生成的命令行/profile**。**没有验证证据**的属性：CPU/内存/磁盘配额（本身没有对应机制）、Seatbelt profile 的真实内核强制、两次命令间环境变量隔离、以及 Windows/MXC 上的网络拒绝端到端测试。 codex:1-7 codex:68-111 

---

## 真正启动受限进程的测试（行为验证）

### 越界文件访问 — `linux-sandbox/tests/suite/sandbox.rs`

全部经 `run_cmd*` → `process_exec_tool_call` 真实 spawn 沙箱化进程 codex:823-880 ：

- `test_root_write`（`should_panic`）：writable_roots 为空时写宿主 tmpfile 被拒 codex:579-590 
- `test_writable_root`：可写根内写入成功 codex:680-696 
- `sandbox_blocks_metadata_writes_inside_writable_root`：可写根内 `.git`/`.codex`/`.aws` 仍只读 codex:904-948 
- `sandbox_blocks_codex_symlink_replacement_attack`：`.codex` 软链接替换攻击被拒 codex:950-984 
- `sandbox_blocks_explicit_split_policy_carveouts_under_bwrap`：嵌套 deny 条目生效 codex:1251-1325 
- `denied_files_tests.rs`：精确路径/glob deny 的读+写双拒 codex:172-209 
- WSL 边界：`wsl_no_proc_masks_inherited_procfs_and_windows_interop` 验证 `--no-proc` 下 `/proc/1` 与 Windows interop 被遮蔽 codex:467-536 

Windows 对应项：`windows_restricted_token_rejects_exact_and_glob_deny_read_policy`（受限令牌对 deny-read fail closed）、`windows_elevated_temp_only_core_and_direct_spawn_enforce_carveouts`、`windows_elevated_unified_exec_enforces_large_recursive_deny_reads`（1000 个递归 deny 文件超 argv 限制的端到端验证）——均真实执行 codex:334-418 codex:998-1113 。`sandbox_blocks_first_time_dot_codex_creation` 在 exec 套件中真实 spawn codex:355-424 。

### 禁止联网 — `assert_network_blocked` 系列

`sandbox_blocks_curl` / `wget` / `ping` / `nc`：真实受限进程连外部地址或 localhost，`exit_code == 0` 即判逃逸 codex:882-902 。`managed_proxy.rs` 验证代理模式下 seccomp 过滤的 namespace reaper 与孤儿回收 codex:194-232 codex:275-309 。

### 子进程继承

- `sandboxed_command_has_no_effective_or_permitted_capabilities`：进程内 `capget` 验证能力清零 codex:742-761 
- `sandbox_inner_stage_rejects_retained_capabilities`：在 user namespace 内运行 helper 验证保留 capability 会 panic codex:763-811 
- `pid_inheritance_is_startup_only_for_process_and_filesystem_helpers`：真实拉起 `codex exec-server`，验证配置/env 不能开启 PID 继承 codex:15-94 
- `remote_process_keeps_sandbox_helper_visible_with_restricted_reads`、`remote_process_preserves_empty_workspace_roots`：经 `backend.start` 真实受限 spawn codex:903-966 codex:1042-1097 

### 失败清理 / 超时

- `kill_child_process_group_kills_grandchildren_on_timeout`：真实进程 + 超时 SIGKILL 组，用 `kill(pid, 0)` 轮询确认孙进程死亡 codex:1381-1446 
- `test_timeout`：`sleep 2` 在 50ms 超时触发 `Sandbox(Timeout)` codex:813-817 
- Windows：Job 终止 vs 正常退出保留后代的行为差异测试（前轮已述）。

## 只检查生成配置的测试

| 测试 | 验证内容 | 不验证 |
|---|---|---|
| `sandbox_request_wraps_native_argv_on_executor` | argv 包装、`--permission-profile` JSON、`--sandbox-policy-cwd`/`--command-cwd` 位置 | 实际隔离效果 codex:68-164  |
| `seatbelt_tests.rs` | 生成的 SBPL 文本含/不含特定规则 | macOS 内核是否真拒绝 |
| `bwrap_tests.rs`（见 wiki） | `BwrapArgs` 参数构成 | bwrap 执行结果 |
| `build_exec_request_projects_workspace_roots_only_for_windows_sandbox` | 请求字段投影 | spawn 行为 |

## 缺少验证证据的安全属性

1. **资源超限（CPU/内存/磁盘配额）**：仓库无 cgroup/rlimit 机制，自然无测试；`test_timeout` 只覆盖运行时间。
2. **Seatbelt 真实强制**：`seatbelt_tests.rs` 全是字符串断言；未见 macOS 上真实 `sandbox-exec` 越界行为测试。
3. **命令间环境变量隔离**：未见测试断言上一次命令的 `export` 不泄漏到下一次。
4. **Windows/MXC 网络拒绝**：`remote_windows_sandbox_process_accepts_process_write` 只验证 stdin/输出，非网络边界 codex:1994-2027 。
5. **域名白名单端到端**：`NetworkPolicyDecider` 单元测试覆盖规则匹配，但"受限进程→代理→拒绝域名"的完整链路仅在 `managed_proxy.rs` 部分覆盖。
6. **`sandbox_integrity` 非强制**：其 AGENTS.md 明示是近似遥测，"不重建原生强制或审计 ACL" codex:24-31 。

## Notes

- 多数 Linux 测试带 `should_skip_bwrap_tests()` 门卫——在缺 user namespace 的 CI 上会静默跳过，这意味着"有测试"不等于"CI 实际执行了"。
- 索引未含 `landlock.rs`、`root_metadata_tests.rs`、`bwrap_path.rs` 的测试体；如需确认 Landlock 回退路径的覆盖情况可开 Devin 会话。

Wiki pages you might want to explore:
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
- [Exec Server (openai/codex)](/wiki/openai/codex#4.7)

Wiki pages you might want to explore:
- [Shell Execution Tools (openai/codex)](/wiki/openai/codex#5.2)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
### Citations
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L1-7)
```rust
//! End-to-end Linux sandbox coverage for filesystem isolation and syscall filtering.

#![cfg(target_os = "linux")]
#![allow(clippy::unwrap_used)]
use codex_core::exec::ExecCapturePolicy;
use codex_core::exec::ExecParams;
use codex_core::exec::process_exec_tool_call;
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L467-536)
```rust
#[tokio::test]
async fn wsl_no_proc_masks_inherited_procfs_and_windows_interop() {
    let Some(powershell) = wsl_windows_executable(r"WindowsPowerShell\v1.0\powershell.exe").await
    else {
        return;
    };
    let args = [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Write-Output interop-escaped",
    ];
    if wsl_baseline_output(&powershell, &args).await.is_none() || should_skip_bwrap_tests().await {
        return;
    }

    let profile = PermissionProfile::from_runtime_permissions(
        &FileSystemSandboxPolicy::read_only(),
        NetworkSandboxPolicy::Enabled,
    );
    let profile = serde_json::to_string(&profile).expect("serialize permission profile");
    let cwd = std::env::current_dir().expect("current directory");
    let proc_check = tokio::time::timeout(
        Duration::from_millis(NETWORK_TIMEOUT_MS),
        tokio::process::Command::new(codex_linux_sandbox_exe())
            .arg("--sandbox-policy-cwd")
            .arg(&cwd)
            .args([
                "--permission-profile",
                &profile,
                "--no-proc",
                "--",
                "/bin/sh",
                "-c",
                "test ! -e /proc/1",
            ])
            .kill_on_drop(true)
            .output(),
    )
    .await
    .expect("procfs check should finish")
    .expect("sandbox helper should start");
    assert!(
        proc_check.status.success(),
        "inherited procfs was not masked: {}",
        String::from_utf8_lossy(&proc_check.stderr)
    );

    let output = tokio::time::timeout(
        Duration::from_millis(NETWORK_TIMEOUT_MS),
        tokio::process::Command::new(codex_linux_sandbox_exe())
            .arg("--sandbox-policy-cwd")
            .arg(&cwd)
            .args([
                "--permission-profile",
                &profile,
                "--no-proc",
                "--",
                &powershell,
            ])
            .args(args)
            .kill_on_drop(true)
            .output(),
    )
    .await
    .expect("sandbox command should finish")
    .expect("sandbox helper should start");
    assert!(!output.status.success());
    assert!(!String::from_utf8_lossy(&output.stdout).contains("interop-escaped"));
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L579-590)
```rust
#[tokio::test]
#[should_panic]
async fn test_root_write() {
    let tmpfile = NamedTempFile::new().unwrap();
    let tmpfile_path = tmpfile.path().to_string_lossy();
    run_cmd(
        &["bash", "-lc", &format!("echo blah > {tmpfile_path}")],
        &[],
        SHORT_TIMEOUT_MS,
    )
    .await;
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L680-696)
```rust
#[tokio::test]
async fn test_writable_root() {
    let tmpdir = tempfile::tempdir().unwrap();
    let file_path = tmpdir.path().join("test");
    run_cmd(
        &[
            "bash",
            "-lc",
            &format!("echo blah > {}", file_path.to_string_lossy()),
        ],
        &[tmpdir.path().to_path_buf()],
        // We have seen timeouts when running this test in CI on GitHub,
        // so we are using a generous timeout until we can diagnose further.
        LONG_TIMEOUT_MS,
    )
    .await;
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L742-761)
```rust
#[tokio::test]
async fn sandboxed_command_has_no_effective_or_permitted_capabilities() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bwrap sandbox prerequisites are unavailable");
        return;
    }

    let output = run_cmd_output(
        &[
            "python3",
            "-c",
            "import ctypes; h=(ctypes.c_uint*2)(0x20080522,0); d=(ctypes.c_uint*6)(); assert ctypes.CDLL(None).capget(h,d)==0; print(d[0],d[1],d[3],d[4])",
        ],
        &[],
        LONG_TIMEOUT_MS,
    )
    .await;
    assert_eq!(output.exit_code, 0);
    assert_eq!(output.stdout.text, "0 0 0 0\n");
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L763-811)
```rust
#[tokio::test]
async fn sandbox_inner_stage_rejects_retained_capabilities() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bwrap sandbox prerequisites are unavailable");
        return;
    }

    let user_namespace_probe = match std::process::Command::new("unshare")
        .args(["--user", "--map-root-user", "--", "/bin/true"])
        .output()
    {
        Ok(output) => output,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            eprintln!("skipping capability test: unshare is unavailable");
            return;
        }
        Err(err) => panic!("failed to probe unprivileged user namespaces: {err}"),
    };
    if !user_namespace_probe.status.success() {
        eprintln!("skipping capability test: unprivileged user namespaces are unavailable");
        return;
    }

    let permission_profile = serde_json::to_string(&PermissionProfile::read_only())
        .expect("read-only permission profile should serialize");
    let output = std::process::Command::new("unshare")
        .args(["--user", "--map-root-user", "--"])
        .arg(codex_linux_sandbox_exe())
        .args(["--sandbox-policy-cwd", "/", "--permission-profile"])
        .arg(permission_profile)
        .args([
            "--apply-seccomp-then-exec",
            "--",
            "/bin/sh",
            "-c",
            "printf command-ran",
        ])
        .output()
        .expect("capability-bearing sandbox helper should execute");

    assert!(!output.status.success());
    assert_eq!(output.stdout, Vec::<u8>::new());
    assert!(
        String::from_utf8_lossy(&output.stderr)
            .contains("Linux sandbox retained effective or permitted capabilities"),
        "unexpected stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L813-817)
```rust
#[tokio::test]
#[should_panic(expected = "Sandbox(Timeout")]
async fn test_timeout() {
    run_cmd(&["sleep", "2"], &[], /*timeout_ms*/ 50).await;
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L823-880)
```rust
async fn assert_network_blocked(cmd: &[&str]) {
    let cwd = AbsolutePathBuf::current_dir().expect("cwd should exist");
    let sandbox_cwd = cwd.clone();
    let params = ExecParams {
        command: cmd.iter().copied().map(str::to_owned).collect(),
        cwd,
        // Give the tool a generous 2-second timeout so even slow DNS timeouts
        // do not stall the suite.
        expiration: NETWORK_TIMEOUT_MS.into(),
        capture_policy: ExecCapturePolicy::ShellTool,
        env: create_env_from_core_vars(),
        network: None,
        network_environment_id: None,
        sandbox_permissions: SandboxPermissions::UseDefault,
        windows_sandbox_level: WindowsSandboxLevel::Disabled,
        justification: None,
        arg0: None,
    };

    let codex_linux_sandbox_exe: Option<PathBuf> = Some(codex_linux_sandbox_exe());
    let permission_profile = PermissionProfile::read_only();
    let result = process_exec_tool_call(
        params,
        &permission_profile,
        &sandbox_cwd,
        std::slice::from_ref(&sandbox_cwd),
        &codex_linux_sandbox_exe,
        /*codex_self_exe*/ &None,
        /*use_legacy_landlock*/ false,
        /*stdout_stream*/ None,
    )
    .await;

    let output = match result {
        Ok(output) => output,
        Err(err) => match err.details() {
            CodexErrorDetails::Sandbox(SandboxErr::Denied { output, .. }) => {
                output.as_ref().clone()
            }
            details => panic!("expected sandbox denied error, got: {details:?}"),
        },
    };

    dbg!(&output.stderr.text);
    dbg!(&output.stdout.text);
    dbg!(&output.exit_code);

    // A completely missing binary exits with 127.  Anything else should also
    // be non‑zero (EPERM from seccomp will usually bubble up as 1, 2, 13…)
    // If—*and only if*—the command exits 0 we consider the sandbox breached.

    if output.exit_code == 0 {
        panic!(
            "Network sandbox FAILED - {cmd:?} exited 0\nstdout:\n{}\nstderr:\n{}",
            output.stdout.text, output.stderr.text
        );
    }
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L882-902)
```rust
#[tokio::test]
async fn sandbox_blocks_curl() {
    assert_network_blocked(&["curl", "-I", "http://openai.com"]).await;
}

#[tokio::test]
async fn sandbox_blocks_wget() {
    assert_network_blocked(&["wget", "-qO-", "http://openai.com"]).await;
}

#[tokio::test]
async fn sandbox_blocks_ping() {
    // ICMP requires raw socket – should be denied quickly with EPERM.
    assert_network_blocked(&["ping", "-c", "1", "8.8.8.8"]).await;
}

#[tokio::test]
async fn sandbox_blocks_nc() {
    // Zero‑length connection attempt to localhost.
    assert_network_blocked(&["nc", "-z", "127.0.0.1", "80"]).await;
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L904-948)
```rust
#[test_case::test_case(".git", "config")]
#[test_case::test_case(".codex", "config.toml")]
#[test_case::test_case(".aws", "config")]
#[tokio::test]
async fn sandbox_blocks_metadata_writes_inside_writable_root(name: &str, config: &str) {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bwrap sandbox prerequisites are unavailable");
        return;
    }

    let home = tempfile::tempdir().expect("tempdir");
    let metadata = home.path().join(name);
    std::fs::create_dir(&metadata).expect("create protected directory");
    let target = metadata.join(config);
    std::fs::write(&target, "original").expect("write protected config");
    let output = run_cmd_result_with_writable_roots(
        &[
            "/bin/sh",
            "-c",
            r#"set -eu
writable_home="$1"
printf permitted > "$writable_home/allowed"
if (printf changed > "$2") 2>/dev/null; then exit 1; fi
printf protected"#,
            "metadata-test",
            home.path().to_str().expect("UTF-8 home"),
            target.to_str().expect("UTF-8 config"),
        ],
        &[home.path().to_path_buf()],
        LONG_TIMEOUT_MS,
        /*use_legacy_landlock*/ false,
        /*network_access*/ true,
    )
    .await
    .expect("sandbox should run with a separate writable home");
    assert_eq!(
        (output.exit_code, output.stdout.text, output.stderr.text),
        (0, "protected".to_string(), String::new())
    );
    assert_eq!(std::fs::read_to_string(target).unwrap(), "original");
    assert_eq!(
        std::fs::read_to_string(home.path().join("allowed")).unwrap(),
        "permitted"
    );
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L950-984)
```rust
#[tokio::test]
async fn sandbox_blocks_codex_symlink_replacement_attack() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bwrap sandbox prerequisites are unavailable");
        return;
    }

    use std::os::unix::fs::symlink;

    let tmpdir = tempfile::tempdir().expect("tempdir");
    let decoy = tmpdir.path().join("decoy-codex");
    std::fs::create_dir_all(&decoy).expect("create decoy dir");

    let dot_codex = tmpdir.path().join(".codex");
    symlink(&decoy, &dot_codex).expect("create .codex symlink");

    let codex_target = dot_codex.join("config.toml");

    let codex_output = expect_denied(
        run_cmd_result_with_writable_roots(
            &[
                "bash",
                "-lc",
                &format!("echo denied > {}", codex_target.to_string_lossy()),
            ],
            &[tmpdir.path().to_path_buf()],
            LONG_TIMEOUT_MS,
            /*use_legacy_landlock*/ false,
            /*network_access*/ true,
        )
        .await,
        ".codex symlink replacement should be denied",
    );
    assert_ne!(codex_output.exit_code, 0);
}
```
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L1251-1325)
```rust
#[tokio::test]
async fn sandbox_blocks_explicit_split_policy_carveouts_under_bwrap() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bwrap sandbox prerequisites are unavailable");
        return;
    }

    let tmpdir = tempfile::tempdir().expect("tempdir");
    let blocked = tmpdir.path().join("blocked");
    std::fs::create_dir_all(&blocked).expect("create blocked dir");
    let blocked_target = blocked.join("secret.txt");
    // These tests bypass the usual legacy-policy bridge, so explicitly keep
    // the sandbox helper binary and minimal runtime paths readable.
    let sandbox_helper_dir = codex_linux_sandbox_exe()
        .parent()
        .expect("sandbox helper should have a parent")
        .to_path_buf();

    let file_system_sandbox_policy = FileSystemSandboxPolicy::restricted(vec![
        FileSystemSandboxEntry {
            path: FileSystemPath::Special {
                value: FileSystemSpecialPath::Minimal,
            },
            access: FileSystemAccessMode::Read,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::Path {
                path: AbsolutePathBuf::try_from(sandbox_helper_dir.as_path())
                    .expect("absolute helper dir")
                    .into(),
            },
            access: FileSystemAccessMode::Read,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::Path {
                path: AbsolutePathBuf::try_from(tmpdir.path())
                    .expect("absolute tempdir")
                    .into(),
            },
            access: FileSystemAccessMode::Write,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::Path {
                path: AbsolutePathBuf::try_from(blocked.as_path())
                    .expect("absolute blocked dir")
                    .into(),
            },
            access: FileSystemAccessMode::Deny,
            missing_path_behavior: None,
        },
    ]);
    let permission_profile = PermissionProfile::from_runtime_permissions(
        &file_system_sandbox_policy,
        NetworkSandboxPolicy::Enabled,
    );
    let output = expect_denied(
        run_cmd_result_with_permission_profile(
            &[
                "bash",
                "-lc",
                &format!("echo denied > {}", blocked_target.to_string_lossy()),
            ],
            permission_profile,
            LONG_TIMEOUT_MS,
            /*use_legacy_landlock*/ false,
        )
        .await,
        "explicit split-policy carveout should be denied under bubblewrap",
    );

    assert_ne!(output.exit_code, 0);
}
```
**File:** codex-rs/exec-server/src/process_sandbox_tests.rs (L68-164)
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
    assert_eq!(prepared.cwd, cwd);
    #[cfg(target_os = "linux")]
    {
        assert_eq!(
            prepared.command.first(),
            Some(&runtime_paths.codex_self_exe.to_string_lossy().into_owned())
        );
        let permission_profile_json = prepared
            .command
            .iter()
            .position(|arg| arg == "--permission-profile")
            .and_then(|index| prepared.command.get(index + 1))
            .expect("sandbox wrapper permission profile");
        let permission_profile: PermissionProfile =
            serde_json::from_str(permission_profile_json).expect("permission profile JSON");
        assert_eq!(
            permission_profile,
            PermissionProfile::workspace_write()
                .materialize_project_roots_with_workspace_roots(std::slice::from_ref(&cwd))
        );

        let policy_directory = tempdir().expect("policy directory");
        let explicit_cwd =
            AbsolutePathBuf::from_absolute_path(policy_directory.path()).expect("policy cwd");
        let mut params = params.clone();
        for policy_cwd in [&cwd, &explicit_cwd] {
            params.sandbox.as_mut().expect("sandbox").cwd = PathUri::from_abs_path(policy_cwd);
            let prepared = prepare_exec_request(
                &params,
                HashMap::new(),
                Some(&runtime_paths),
                /*network_policy_decider*/ None,
                /*network_policy_audit_observer*/ None,
            )
            .await
            .expect("prepare sandboxed request");
            let actual_cwds = prepared
                .command
                .windows(4)
                .find(|args| args[0] == "--sandbox-policy-cwd")
                .expect("sandbox wrapper cwd arguments");
            assert_eq!(
                actual_cwds,
                [
                    "--sandbox-policy-cwd",
                    policy_cwd.to_string_lossy().as_ref(),
                    "--command-cwd",
                    cwd.to_string_lossy().as_ref(),
                ]
            );
        }
    }
    #[cfg(target_os = "macos")]
```
**File:** codex-rs/linux-sandbox/tests/suite/denied_files_tests.rs (L172-209)
```rust
    let output = run_cmd_result_with_permission_profile_for_cwd(
        &[
            "/bin/sh",
            "-c",
            r#"set -eu
/bin/cat AGENTS.md
for blocked in one.key nested/two.key .env.local; do
    if (: < "$blocked") 2>/dev/null; then
        printf 'read unexpectedly allowed: %s\n' "$blocked" >&2
        exit 10
    fi
    if (printf changed > "$blocked") 2>/dev/null; then
        printf 'write unexpectedly allowed: %s\n' "$blocked" >&2
        exit 11
    fi
done
printf 'allowed\n' > allowed.txt
/bin/cat allowed.txt
"#,
        ],
        workspace.clone(),
        permission_profile,
        env,
        LONG_TIMEOUT_MS,
        /*use_legacy_landlock*/ false,
    )
    .await
    .expect("sandbox should start with multiple denied files");

    assert_eq!(
        (output.exit_code, output.stdout.text, output.stderr.text),
        (
            0,
            "project instructions\nallowed\n".to_string(),
            String::new()
        )
    );
    assert_eq!(
```
**File:** codex-rs/core/tests/windows_sandbox.rs (L334-418)
```rust
#[tokio::test]
#[serial(codex_home)]
async fn windows_restricted_token_rejects_exact_and_glob_deny_read_policy() -> anyhow::Result<()> {
    let codex_home =
        codex_home_for_windows_sandbox_test("windows-restricted-token-deny-read-codex-home")?;
    let _codex_home_guard = EnvVarGuard::set("CODEX_HOME", codex_home.path().as_os_str());
    let workspace = TempDir::new()?;
    let cwd = dunce::canonicalize(workspace.path())?.abs();
    let secret = cwd.join("secret.env");
    let future_secret = cwd.join("future.env");
    let public = cwd.join("public.txt");
    std::fs::write(&secret, "glob secret\n")?;
    std::fs::write(&public, "public ok\n")?;

    let file_system_sandbox_policy = FileSystemSandboxPolicy::restricted(vec![
        FileSystemSandboxEntry {
            path: FileSystemPath::Special {
                value: FileSystemSpecialPath::Root,
            },
            access: FileSystemAccessMode::Read,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::Special {
                value: FileSystemSpecialPath::project_roots(/*subpath*/ None),
            },
            access: FileSystemAccessMode::Write,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::GlobPattern {
                pattern: "**/*.env".to_string(),
            },
            access: FileSystemAccessMode::Deny,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::Path {
                path: future_secret.into(),
            },
            access: FileSystemAccessMode::Deny,
            missing_path_behavior: None,
        },
    ]);
    let permission_profile = PermissionProfile::from_runtime_permissions(
        &file_system_sandbox_policy,
        NetworkSandboxPolicy::Restricted,
    );

    let err = process_exec_tool_call(
        ExecParams {
            command: vec![
                "cmd.exe".to_string(),
                "/D".to_string(),
                "/C".to_string(),
                "type secret.env >NUL 2>NUL & echo exact secret 1>future.env 2>NUL & type future.env 2>NUL & type public.txt & exit /B 0"
                    .to_string(),
            ],
            cwd: cwd.clone(),
            expiration: 10_000.into(),
            capture_policy: ExecCapturePolicy::ShellTool,
            env: HashMap::new(),
            network: None,
            network_environment_id: None,
            sandbox_permissions: SandboxPermissions::UseDefault,
            windows_sandbox_level: WindowsSandboxLevel::RestrictedToken,
            justification: None,
            arg0: None,
        },
        &permission_profile,
        &cwd,
        std::slice::from_ref(&cwd),
        &None,
        /*codex_self_exe*/ &None,
        /*use_legacy_landlock*/ false,
        /*stdout_stream*/ None,
    )
    .await
    .expect_err("restricted-token sandbox should reject deny-read restrictions");

    assert_eq!(
        err.to_string(),
        "unsupported operation: windows unelevated restricted-token sandbox cannot enforce deny-read restrictions directly; refusing to run unsandboxed"
    );
    Ok(())
```
**File:** codex-rs/core/tests/windows_sandbox.rs (L998-1113)
```rust
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial(codex_home)]
async fn windows_elevated_unified_exec_enforces_large_recursive_deny_reads() -> anyhow::Result<()> {
    let _account_guard = WindowsSandboxAccountTestGuard::acquire()?;
    let codex_home =
        codex_home_for_windows_sandbox_test("windows-elevated-tool-runtime-deny-read-codex-home")?;
    let _codex_home_guard = EnvVarGuard::set("CODEX_HOME", codex_home.path().as_os_str());
    stage_windows_sandbox_helpers()?;

    let configured_codex_home = dunce::canonicalize(codex_home.path())?.abs();
    let builder = test_codex()
        .with_windows_cmd_shell()
        .with_config(move |config| {
            config.codex_home = configured_codex_home;
            config.set_windows_elevated_sandbox_enabled(true);
            config
                .features
                .enable(Feature::UnifiedExec)
                .expect("test config should allow unified exec");

            let file_system_sandbox_policy = FileSystemSandboxPolicy::restricted(vec![
                FileSystemSandboxEntry {
                    path: FileSystemPath::Special {
                        value: FileSystemSpecialPath::Root,
                    },
                    access: FileSystemAccessMode::Read,
                    missing_path_behavior: None,
                },
                FileSystemSandboxEntry {
                    path: FileSystemPath::Special {
                        value: FileSystemSpecialPath::project_roots(/*subpath*/ None),
                    },
                    access: FileSystemAccessMode::Write,
                    missing_path_behavior: None,
                },
                FileSystemSandboxEntry {
                    path: FileSystemPath::GlobPattern {
                        pattern: "**/*.env".to_string(),
                    },
                    access: FileSystemAccessMode::Deny,
                    missing_path_behavior: None,
                },
                FileSystemSandboxEntry {
                    path: FileSystemPath::Path {
                        path: config.cwd.join("exact-secret.txt").into(),
                    },
                    access: FileSystemAccessMode::Deny,
                    missing_path_behavior: None,
                },
            ]);
            config
                .permissions
                .set_permission_profile(
                    PermissionProfile::from_runtime_permissions(
                        &file_system_sandbox_policy,
                        NetworkSandboxPolicy::Restricted,
                    )
                    .materialize_project_roots_with_workspace_roots(
                        std::slice::from_ref(&config.cwd),
                    ),
                )
                .expect("set managed deny-read permission profile");
        })
        .with_workspace_setup(|cwd, _fs| async move {
            let nested = cwd.join("nested");
            std::fs::create_dir_all(&nested)?;
            for index in 0..1_000 {
                std::fs::write(nested.join(format!("bulk-{index}.env")), "bulk secret\n")?;
            }
            std::fs::write(
                cwd.join("AGENTS.md"),
                "Preserve the large payload integration fixture.\n",
            )?;
            std::fs::write(
                cwd.join("secret.env"),
                "glob secret should remain private\n",
            )?;
            std::fs::write(
                cwd.join("exact-secret.txt"),
                "exact secret should remain private\n",
            )?;
            std::fs::write(cwd.join("public.txt"), "public ok\n")?;
            Ok(())
        });
    let harness = TestCodexHarness::with_builder(builder).await?;

    let config = &harness.test().config;
    let paths = codex_windows_sandbox::resolve_windows_deny_read_paths(
        &config.permissions.file_system_sandbox_policy(),
        &config.cwd,
    )
    .map_err(anyhow::Error::msg)?;
    assert!(
        paths.len() >= 1_002,
        "recursive deny fixture was not fully expanded"
    );
    // The deny list alone exceeds CreateProcessW's limit, so both wrapper and
    // setup-refresh must transport the full request outside argv.
    assert!(serde_json::to_string(&paths)?.encode_utf16().count() > 32_767);

    let command = concat!(
        "(type secret.env 1>NUL 2>NUL && echo GLOB-READ || echo GLOB-DENIED) & ",
        "(type exact-secret.txt 1>NUL 2>NUL && echo EXACT-READ || echo EXACT-DENIED) & ",
        "(type nested\\bulk-999.env 1>NUL 2>NUL && echo BULK-READ || echo BULK-DENIED) & ",
        "type public.txt"
    );
    let call_id = "windows-managed-deny-read-exec-command";
    let unified_args = json!({
        "cmd": command,
        "yield_time_ms": 30_000,
        "tty": false,
        "login": false,
    });
    mount_sse_sequence(
```
**File:** codex-rs/exec/tests/suite/sandbox.rs (L355-424)
```rust
#[tokio::test]
async fn sandbox_blocks_first_time_dot_codex_creation() {
    core_test_support::skip_if_sandbox!();
    #[cfg(target_os = "linux")]
    let sandbox_env = match linux_sandbox_test_env().await {
        Some(env) => env,
        None => return,
    };
    #[cfg(not(target_os = "linux"))]
    let sandbox_env = HashMap::new();

    let temp = tempfile::tempdir().expect("should be able to create temp dir");
    let repo_root = temp.path().join("repo").abs();
    create_dir_all(&repo_root).await.expect("mkdir repo");
    let dot_codex = repo_root.join(".codex");
    let config_toml = dot_codex.join("config.toml");
    let permission_profile = PermissionProfile::workspace_write_with(
        &[],
        NetworkSandboxPolicy::Restricted,
        /*exclude_tmpdir_env_var*/ true,
        /*exclude_slash_tmp*/ true,
    );

    let mut child = spawn_command_under_sandbox(
        vec![
            "bash".to_string(),
            "-lc".to_string(),
            "mkdir -p .codex && echo 'sandbox_mode = \"danger-full-access\"' > .codex/config.toml"
                .to_string(),
        ],
        repo_root.clone(),
        &permission_profile,
        &repo_root,
        StdioPolicy::RedirectForShellTool,
        sandbox_env,
    )
    .await
    .expect("should spawn command creating .codex");

    let status = child.wait().await.expect("should wait for .codex command");
    assert!(
        !status.success(),
        "sandbox unexpectedly allowed first-time .codex creation: {status:?}"
    );
    let dot_codex_metadata = tokio::fs::symlink_metadata(&dot_codex).await;
    if let Ok(metadata) = dot_codex_metadata {
        assert!(
            !metadata.is_dir(),
            "{} should not be creatable as a directory",
            dot_codex.display()
        );
    } else if let Err(err) = &dot_codex_metadata {
        assert_eq!(
            err.kind(),
            io::ErrorKind::NotFound,
            "unexpected metadata error for {}: {err}",
            dot_codex.display()
        );
    }
    let config_toml_exists = match tokio::fs::try_exists(&config_toml).await {
        Ok(exists) => exists,
        Err(err) if err.kind() == io::ErrorKind::NotADirectory => false,
        Err(err) => panic!("try_exists {} failed: {err}", config_toml.display()),
    };
    assert!(
        !config_toml_exists,
        "{} should not have been created",
        config_toml.display()
    );
}
```
**File:** codex-rs/linux-sandbox/tests/suite/managed_proxy.rs (L194-232)
```rust
#[tokio::test]
async fn sandboxed_commands_have_a_seccomp_filtered_namespace_reaper() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bubblewrap is unavailable");
        return;
    }

    let mut env = create_env_from_core_vars();
    strip_proxy_env(&mut env);

    assert_seccomp_filtered_namespace_reaper(
        &PermissionProfile::read_only(),
        /*allow_network_for_proxy*/ false,
        env,
    )
    .await;
}

#[tokio::test]
async fn managed_proxy_commands_have_a_seccomp_filtered_namespace_reaper() {
    if let Some(skip_reason) = managed_proxy_skip_reason().await {
        eprintln!("skipping managed proxy test: {skip_reason}");
        return;
    }

    let mut env = create_env_from_core_vars();
    strip_proxy_env(&mut env);
    env.insert("HTTP_PROXY".to_string(), "http://127.0.0.1:9".to_string());

    for permission_profile in [PermissionProfile::read_only(), PermissionProfile::Disabled] {
        assert_seccomp_filtered_namespace_reaper(
            &permission_profile,
            /*allow_network_for_proxy*/ true,
            env.clone(),
        )
        .await;
    }
}

```
**File:** codex-rs/linux-sandbox/tests/suite/managed_proxy.rs (L275-309)
```rust
#[tokio::test]
async fn namespace_reaper_collects_orphaned_descendants() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bubblewrap is unavailable");
        return;
    }

    let mut env = create_env_from_core_vars();
    strip_proxy_env(&mut env);

    let output = run_linux_sandbox_direct(
        &[
            "bash",
            "-c",
            "if [ ! -r /proc/self/status ] || [ ! -r /proc/1/status ] || [ \"$(readlink /proc/1/ns/pid 2>/dev/null)\" != \"$(readlink /proc/self/ns/pid 2>/dev/null)\" ]; then printf 'namespace proc unavailable\\n'; exit 0; fi; orphan=$(bash -c 'sleep 0.05 </dev/null >/dev/null 2>&1 & printf \"%s\\n\" \"$!\"'); for _ in $(seq 1 100); do if [ ! -e \"/proc/$orphan\" ]; then printf 'orphan reaped\\n'; exit 0; fi; sleep 0.01; done; exit 1",
        ],
        &PermissionProfile::read_only(),
        /*allow_network_for_proxy*/ false,
        env,
        NETWORK_TIMEOUT_MS,
    )
    .await;

    assert_eq!(
        output.status.success(),
        true,
        "namespace init should reap orphaned descendants; stderr={}",
        String::from_utf8_lossy(&output.stderr)
    );
    if output.stdout == b"namespace proc unavailable\n" {
        eprintln!("skipping orphan reaping check: a namespaced proc mount is unavailable");
        return;
    }
    assert_eq!(output.stdout, b"orphan reaped\n");
}
```
**File:** codex-rs/cli/tests/exec_server/pid_namespace_tests.rs (L15-94)
```rust
#[tokio::test]
async fn pid_inheritance_is_startup_only_for_process_and_filesystem_helpers() -> Result<()> {
    let Some(bwrap) = codex_sandboxing::find_system_bwrap_in_path(
        &PermissionProfile::read_only().file_system_sandbox_policy(),
        &std::env::current_dir()?,
    ) else {
        eprintln!("skipping PID namespace test: no system bubblewrap");
        return Ok(());
    };
    let available = tokio::process::Command::new(&bwrap)
        .args(["--unshare-user", "--ro-bind", "/", "/", "--", "/bin/true"])
        .output()
        .await?;
    if !available.status.success() {
        eprintln!(
            "skipping PID namespace test: {}",
            String::from_utf8_lossy(&available.stderr)
        );
        return Ok(());
    }
    tokio::time::timeout(Duration::from_secs(30), async {
        let fixture = TempDir::new()?;
        let wrapper = fixture.path().join("bwrap");
        std::os::unix::fs::symlink(bwrap, fixture.path().join("real-bwrap"))?;
        codex_utils_cargo_bin::write_executable(&wrapper, r#"#!/bin/sh
for arg in "$@"; do
    [ "$arg" = "--" ] && break
    if [ "$arg" = "--proc" ]; then
        echo "bwrap: Can't mount proc on /newroot/proc: Operation not permitted" >&2
        exit 1
    fi
done
exec "${0%/*}/real-bwrap" "$@"
"#)?;
        let path = format!("{}:{}", fixture.path().display(), std::env::var("PATH")?);
        // System bubblewrap discovery intentionally excludes executables under the command cwd.
        let workspace = TempDir::new()?;
        let file = workspace.path().join("readable");
        std::fs::write(&file, "ok")?;
        let file_uri = url::Url::from_file_path(&file).unwrap();
        let cwd = url::Url::from_directory_path(workspace.path()).unwrap();
        let minimal_policy = FileSystemSandboxPolicy::restricted(vec![
            FileSystemSandboxEntry::new(
                FileSystemPath::Special { value: FileSystemSpecialPath::Minimal },
                FileSystemAccessMode::Read,
            ),
            FileSystemSandboxEntry::new(
                AbsolutePathBuf::try_from(workspace.path())?.into(), FileSystemAccessMode::Read,
            ),
            FileSystemSandboxEntry::new(
                AbsolutePathBuf::from_absolute_path("/proc/version")?.into(), FileSystemAccessMode::Deny,
            ),
        ]);
        let minimal_profile = PermissionProfile::from_runtime_permissions(
            &minimal_policy, NetworkSandboxPolicy::Restricted,
        );
        for (inherit, profile) in [
            (false, PermissionProfile::read_only()),
            (true, PermissionProfile::read_only()),
            (true, minimal_profile),
        ] {
            let minimal = profile.file_system_sandbox_policy().include_platform_defaults();
            let sandbox = FileSystemSandboxContext::from_permission_profile(
                profile, cwd.as_str().parse()?,
            );
            let codex_home = TempDir::new()?;
            // Neither a config key nor executor/request environment variables may opt in.
            std::fs::write(codex_home.path().join("config.toml"),
                "linux_sandbox_pid_namespace = 'inherit'\n")?;
            let mut command = tokio::process::Command::new(codex_utils_cargo_bin::cargo_bin("codex")?);
            command.args(["exec-server", "--listen", "stdio"])
                .env("CODEX_HOME", codex_home.path())
                .env("PATH", &path)
                .env("CODEX_LINUX_SANDBOX_PID_NAMESPACE", "inherit")
                .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
                .kill_on_drop(true);
            if inherit {
                command.arg("--linux-sandbox-pid-namespace=inherit");
            }
            let mut child = command.spawn()?;
```
**File:** codex-rs/exec-server/tests/exec_process.rs (L903-966)
```rust
#[cfg(target_os = "linux")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn remote_process_keeps_sandbox_helper_visible_with_restricted_reads() -> Result<()> {
    if let Some(warning) = codex_sandboxing::system_bwrap_warning(
        &PermissionProfile::read_only(),
        &std::env::current_dir()?,
    ) {
        eprintln!("skipping bwrap test: {warning}");
        return Ok(());
    }

    let context = create_process_context(/*use_remote*/ true).await?;
    let workspace = TempDir::new()?;
    let file = workspace.path().join("allowed.txt");
    std::fs::write(&file, b"allowed")?;
    let cwd = PathUri::from_host_native_path(workspace.path())?;
    let policy = FileSystemSandboxPolicy::restricted(vec![
        FileSystemSandboxEntry {
            path: FileSystemPath::Special {
                value: FileSystemSpecialPath::Minimal,
            },
            access: FileSystemAccessMode::Read,
            missing_path_behavior: None,
        },
        FileSystemSandboxEntry {
            path: FileSystemPath::Special {
                value: FileSystemSpecialPath::project_roots(/*subpath*/ None),
            },
            access: FileSystemAccessMode::Read,
            missing_path_behavior: None,
        },
    ]);
    let sandbox = FileSystemSandboxContext::from_permission_profile(
        PermissionProfile::from_runtime_permissions(&policy, NetworkSandboxPolicy::Restricted),
        cwd.clone(),
    );

    let session = context
        .backend
        .start(ExecParams {
            metadata: Default::default(),
            process_id: ProcessId::from("proc-restricted-helper"),
            argv: vec!["/bin/cat".to_string(), file.to_string_lossy().into_owned()],
            cwd,
            shell_snapshot: None,
            env_policy: /*env_policy*/ None,
            env: HashMap::from([("PATH".to_string(), std::env::var("PATH")?)]),
            tty: false,
            pipe_stdin: false,
            arg0: None,
            sandbox: Some(sandbox),
            enforce_managed_network: false,
            managed_network: None,
            network_proxy: None,
        })
        .await?;
    let output = collect_process_output_from_events(session.process).await?;

    assert_eq!(
        output,
        ("allowed".to_string(), String::new(), Some(0), true)
    );
    Ok(())
}
```
**File:** codex-rs/exec-server/tests/exec_process.rs (L1042-1097)
```rust
#[cfg(unix)]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn remote_process_preserves_empty_workspace_roots() -> Result<()> {
    if let Some(warning) = codex_sandboxing::system_bwrap_warning(
        &PermissionProfile::read_only(),
        &std::env::current_dir()?,
    ) {
        eprintln!("skipping bwrap test: {warning}");
        return Ok(());
    }

    let context = create_process_context(/*use_remote*/ true).await?;
    let tmp = TempDir::new()?;
    let file = tmp.path().join("excluded.txt");
    std::fs::write(&file, b"excluded")?;
    let cwd = PathUri::from_host_native_path(tmp.path())?;
    let policy = FileSystemSandboxPolicy::restricted(vec![FileSystemSandboxEntry {
        path: FileSystemPath::Special {
            value: FileSystemSpecialPath::project_roots(/*subpath*/ None),
        },
        access: FileSystemAccessMode::Read,
        missing_path_behavior: None,
    }]);
    let mut sandbox = FileSystemSandboxContext::from_permission_profile(
        PermissionProfile::from_runtime_permissions(&policy, NetworkSandboxPolicy::Restricted),
        cwd.clone(),
    );
    sandbox.workspace_roots.clear();

    let session = context
        .backend
        .start(ExecParams {
            metadata: Default::default(),
            process_id: ProcessId::from("proc-empty-workspace-roots"),
            argv: vec!["/bin/cat".to_string(), file.to_string_lossy().into_owned()],
            cwd,
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
        })
        .await?;
    let (stdout, _stderr, exit_code, closed) =
        collect_process_output_from_events(session.process).await?;

    assert!(!stdout.contains("excluded"), "unexpected stdout: {stdout}");
    assert_ne!(exit_code, Some(0));
    assert!(closed);
    Ok(())
}
```
**File:** codex-rs/exec-server/tests/exec_process.rs (L1994-2027)
```rust
#[test_case(false ; "local")]
#[test_case(true ; "remote")]
#[cfg_attr(not(unix), ignore = "Unix-only exec-server process test")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
// Serialize tests that launch a real exec-server process through the full CLI.
#[serial_test::serial(remote_exec_server)]
async fn exec_process_write_then_read_without_tty(use_remote: bool) -> Result<()> {
    assert_exec_process_write_then_read_without_tty(use_remote).await
}

#[test_case(
    codex_sandboxing::SandboxType::WindowsRestrictedToken,
    false;
    "restricted_token"
)]
#[test_case(
    codex_sandboxing::SandboxType::WindowsMxc,
    false;
    "mxc_pipe"
)]
#[test_case(
    codex_sandboxing::SandboxType::WindowsMxc,
    true;
    "mxc_conpty"
)]
#[cfg_attr(not(windows), ignore = "Windows-only exec-server sandbox process test")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial_test::serial(remote_exec_server)]
async fn remote_windows_sandbox_process_accepts_process_write(
    expected_sandbox_type: codex_sandboxing::SandboxType,
    tty: bool,
) -> Result<()> {
    assert_remote_windows_sandbox_process_write(expected_sandbox_type, tty).await
}
```
**File:** codex-rs/core/src/exec_tests.rs (L1381-1446)
```rust
#[cfg(unix)]
#[tokio::test]
async fn kill_child_process_group_kills_grandchildren_on_timeout() -> Result<()> {
    // On Linux/macOS, /bin/bash is typically present; on FreeBSD/OpenBSD,
    // prefer /bin/sh to avoid NotFound errors.
    #[cfg(any(target_os = "freebsd", target_os = "openbsd"))]
    let command = vec![
        "/bin/sh".to_string(),
        "-c".to_string(),
        "sleep 60 & echo $!; sleep 60".to_string(),
    ];
    #[cfg(all(unix, not(any(target_os = "freebsd", target_os = "openbsd"))))]
    let command = vec![
        "/bin/bash".to_string(),
        "-c".to_string(),
        "sleep 60 & echo $!; sleep 60".to_string(),
    ];
    let cwd = codex_utils_absolute_path::AbsolutePathBuf::current_dir()?;
    let env: HashMap<String, String> = std::env::vars().collect();
    let params = ExecParams {
        command,
        cwd,
        expiration: 500.into(),
        capture_policy: ExecCapturePolicy::ShellTool,
        env,
        network: None,
        network_environment_id: None,
        sandbox_permissions: SandboxPermissions::UseDefault,
        windows_sandbox_level: codex_protocol::config_types::WindowsSandboxLevel::Disabled,
        justification: None,
        arg0: None,
    };

    let output = exec(
        params,
        NetworkSandboxPolicy::Restricted,
        /*stdout_stream*/ None,
        /*after_spawn*/ None,
    )
    .await?;
    assert!(output.timed_out);

    let stdout = output.stdout.from_utf8_lossy().text;
    let pid_line = stdout.lines().next().unwrap_or("").trim();
    let pid: i32 = pid_line.parse().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Failed to parse pid from stdout '{pid_line}': {error}"),
        )
    })?;

    let mut killed = false;
    for _ in 0..20 {
        // Use kill(pid, 0) to check if the process is alive.
        if unsafe { libc::kill(pid, 0) } == -1
            && let Some(libc::ESRCH) = std::io::Error::last_os_error().raw_os_error()
        {
            killed = true;
            break;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    assert!(killed, "grandchild process with pid {pid} is still alive");
    Ok(())
}
```
