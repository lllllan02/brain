## Q11
假设 Agent 获准运行 python task.py，脚本随后读取项目外的私人文件、连接未授权站点，并启动后台子进程。请分别指出这三步由哪个组件约束、使用哪条规则、如何反馈失败；配置允许的行为请明确写“允许”，不要假定所有沙箱都会阻止。
### Answer
**简答**：三步是否被拦取决于所选 `PermissionProfile`，不能一概说"阻止"。①读项目外文件：`workspace_write` 下**允许**（默认全磁盘可读，仅写受限）；`read_only`/restricted split 策略下由 bwrap 遮蔽挂载/只读绑定、Seatbelt 规则或 Windows deny ACE 拒绝，程序拿到 `ENOENT`/`EPERM`/`EROFS`。②连未授权站点：`NetworkSandboxPolicy::Enabled` 下**允许**；`Restricted` 下 Linux 由 `--unshare-net` + seccomp 在 syscall 层拒（`socket`/`connect` → `EPERM`）；managed proxy 模式流量被路由到 `NetworkProxy`，由域名白名单判拒。③后台子进程：自动继承同一沙箱（seccomp/netns/进程组），**允许**启动，但归进程组清理管——超时/取消时随整组被杀。任一拒绝都会被识别为 `SandboxErr::Denied` 回传并可能触发审批重试 codex:42-52 。

---

## 逐步分析

### ① 读取项目外私人文件

| 配置 | 结果 | 约束组件与规则 |
|---|---|---|
| `workspace_write`（legacy） | **允许** | 该模型默认全盘可读，只限制写 codex:67-70  |
| restricted split 策略，路径不在读根内 | 拒绝 | Linux：`--ro-bind / /` 使路径仍可见但只读，deny glob 经 mount 遮蔽变不可见；`sandbox_starts_with_denied_tmp_without_exposing_registry` 验证 `test ! -r` 与写均失败 codex:1327-1399  |
| Windows restricted-token | 拒绝或 fail closed | deny-read 需 elevated 后端，否则 transform 直接报错拒绝启动 codex:87-90  |

反馈：内核返回 `EPERM`/`ENOENT`，进程非零退出 → `is_likely_sandbox_denied` → `SandboxErr::Denied` codex:1373-1379 。

### ② 连接未授权站点

| 配置 | 结果 | 约束组件与规则 |
|---|---|---|
| `NetworkSandboxPolicy::Enabled` | **允许** | 无 netns 隔离、无网络 seccomp（仅 `AF_VSOCK`/`io_uring` 兜底） codex:59-66  |
| `Restricted`（无代理） | syscall 拒绝 | `--unshare-net` 隔离 netns + Restricted seccomp 拒 `connect`/`sendto`/`socket(AF_INET)` codex:93-97  |
| Managed proxy | 代理层拒绝 | 流量经 TCP→UDS→TCP 桥只到代理端口；域名白名单在 `NetworkPolicyDecider` 内判定，拒绝时 `SandboxErr::Denied` 携带 `network_policy_decision`（可转 `network_approval_context` 提示审批） codex:49-52 codex:412-428  |

反馈：socket 返回 `EPERM` 或代理拒绝连接；若退出码/输出命中启发式则上报 `Denied`，审批流程可能重试。 codex:823-880  展示了 `assert_network_blocked` 如何判定"exit 0 即逃逸"。

### ③ 启动后台子进程

**允许**启动——无规则禁止 fork/spawn；但沙箱限制**自动继承**：

- seccomp 过滤器和 `PR_SET_NO_NEW_PRIVS` 在 `fork()` 前装好、随 `exec` 传给孩子；同一 mount/net namespace、capability 为 0（inner stage 断言） codex:235-257 codex:203-225 。
- 约束它的是**进程组清理**而非访问控制：spawn 时 `process_group(0)`/`setsid` 建组；超时 → `kill_process_group` SIGKILL；取消 → SIGTERM 宽限期 → SIGKILL。`kill_child_process_group_kills_grandchildren_on_timeout` 用 `kill(pid,0)` 轮询验证 `sleep 60 &` 孙子被清 codex:1381-1446 。
- **例外**：自行 `setsid` 脱离组的 daemon 打不到；Windows 正常退出**有意保留**后代，仅 MXC runner 在前台退出/取消时终止全部后代 codex:76-80 。
- 文件系统 helper 走同一边界：`sandbox_exec_request` 在 `sandbox == None` 时直接报错拒绝 codex:160-170 。

## Notes

- 三者都不受 execpolicy 前缀规则管——那只审命令字符串，不审运行期行为。
- 文件读拒绝可被 `EscalatedSandboxWithRestrictions` 审批扩大；网络拒绝走 `network_approval_context`；后台进程不存在"审批"通道，只受继承限制与生命周期管理。
- 无 CPU/内存/磁盘配额——后台进程消耗资源不受限，只能靠超时/取消回收。

Wiki pages you might want to explore:
- [Sandbox and Approval Policies (openai/codex)](/wiki/openai/codex#2.4)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
### Citations
**File:** codex-rs/protocol/src/error.rs (L42-52)
```rust
#[derive(Error, Debug)]
pub enum SandboxErr {
    /// Error from sandbox execution
    #[error(
        "sandbox denied exec error, exit code: {}, stdout: {}, stderr: {}",
        .output.exit_code, .output.stdout.text, .output.stderr.text
    )]
    Denied {
        output: Box<ExecToolCallOutput>,
        network_policy_decision: Option<NetworkPolicyDecisionPayload>,
    },
```
**File:** codex-rs/core/README.md (L67-70)
```markdown
Legacy `SandboxPolicy` / `sandbox_mode` configs are still supported on
Windows. Legacy `read-only` and `workspace-write` policies imply full
filesystem read access; exact readable roots are represented by split
filesystem policies instead.
```
**File:** codex-rs/core/README.md (L87-90)
```markdown
New `[permissions]` / split filesystem policies remain supported on Windows
only when they can be enforced directly by the selected Windows backend or
round-trip through the legacy `SandboxPolicy` model without changing semantics.
Policies that would require direct explicit unreadable carveouts (`none`) or
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
**File:** codex-rs/linux-sandbox/tests/suite/sandbox.rs (L1327-1399)
```rust
#[tokio::test]
async fn sandbox_starts_with_denied_tmp_without_exposing_registry() {
    if should_skip_bwrap_tests().await {
        eprintln!("skipping bwrap test: bwrap sandbox prerequisites are unavailable");
        return;
    }

    let temp = tempfile::tempdir().expect("tempdir");
    std::fs::write(temp.path().join("AGENTS.md"), "project instructions\n")
        .expect("write instructions");
    let cwd = AbsolutePathBuf::try_from(temp.path()).expect("absolute workspace");
    let sandbox_helper = codex_linux_sandbox_exe();
    let helper_dir = AbsolutePathBuf::try_from(sandbox_helper.parent().expect("helper parent"))
        .expect("absolute helper directory");

    for tmp_root in [PathBuf::from("/tmp"), temp.path().join("denied-tmp")] {
        std::fs::create_dir_all(&tmp_root).expect("create temp root");
        let secret = NamedTempFile::new_in(&tmp_root).expect("denied file");
        std::fs::write(secret.path(), "private").expect("write denied file");
        for read_root in [FileSystemSpecialPath::Root, FileSystemSpecialPath::Minimal] {
            let denied_path = if tmp_root == std::path::Path::new("/tmp") {
                FileSystemPath::Special {
                    value: FileSystemSpecialPath::SlashTmp,
                }
            } else {
                AbsolutePathBuf::try_from(tmp_root.as_path())
                    .expect("absolute temp root")
                    .into()
            };
            let policy = FileSystemSandboxPolicy::restricted(vec![
                FileSystemSandboxEntry::new(
                    FileSystemPath::Special { value: read_root },
                    FileSystemAccessMode::Read,
                ),
                FileSystemSandboxEntry::new(helper_dir.clone().into(), FileSystemAccessMode::Read),
                FileSystemSandboxEntry::new(cwd.clone().into(), FileSystemAccessMode::Write),
                FileSystemSandboxEntry::new(denied_path, FileSystemAccessMode::Deny),
            ]);
            let mut env = create_env_from_core_vars();
            env.insert("TMPDIR".to_string(), tmp_root.display().to_string());
            env.insert(
                "DENIED_SECRET".to_string(),
                secret.path().display().to_string(),
            );
            let output = run_cmd_result_with_permission_profile_for_cwd(
                &[
                    "sh",
                    "-c",
                    r#"set -e
cat AGENTS.md
test ! -r "$DENIED_SECRET"
if printf modified > "$DENIED_SECRET" 2>/dev/null; then exit 1; fi
registry="$TMPDIR/codex-bwrap-synthetic-mount-targets-$(id -u)"
test ! -e "$registry"
"#,
                ],
                cwd.clone(),
                PermissionProfile::from_runtime_permissions(&policy, NetworkSandboxPolicy::Enabled),
                env,
                LONG_TIMEOUT_MS,
                /*use_legacy_landlock*/ false,
            )
            .await
            .expect("sandbox should start with denied temp directory");
            assert_eq!(
                (output.exit_code, output.stdout.text.as_str()),
                (0, "project instructions\n"),
                "stderr: {}",
                output.stderr.text
            );
            assert_eq!(std::fs::read_to_string(secret.path()).unwrap(), "private");
            assert!(!temp.path().join(".git").exists());
        }
```
**File:** codex-rs/core/src/exec_tests.rs (L1373-1379)
```rust
#[cfg(unix)]
#[test]
fn sandbox_detection_flags_sigsys_exit_code() {
    let exit_code = EXIT_CODE_SIGNAL_BASE + libc::SIGSYS;
    let output = make_exec_output(exit_code, "", "", "");
    assert!(is_likely_sandbox_denied(SandboxType::LinuxSeccomp, &output));
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
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L59-66)
```rust
    .or_else(|| {
        // VM sockets can reach host services outside the filesystem sandbox.
        // In WSL2 they also allow Windows process launch through an alias of
        // the interop socket, even when /run/WSL is masked. Keep ordinary
        // network access while denying that host bridge.
        (!file_system_sandbox_policy.has_full_disk_write_access())
            .then_some(NetworkSeccompMode::VmSocketRestricted)
    });
```
**File:** codex-rs/linux-sandbox/README.md (L93-97)
```markdown
- When bubblewrap is active and network is restricted without proxy routing, the helper also
  isolates the network namespace via `--unshare-net`.
- In managed proxy mode, the helper uses `--unshare-net` plus an internal
  TCP->UDS->TCP routing bridge so tool traffic reaches only configured proxy
  endpoints.
```
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L203-225)
```rust
        let mut capability_header = [LINUX_CAPABILITY_VERSION_3, 0];
        let mut capability_sets = [[0_u32; 3]; 2];
        // SAFETY: capability ABI version 3 uses a [version, pid] header and
        // two [effective, permitted, inheritable] capability-set entries.
        let result = unsafe {
            libc::syscall(
                libc::SYS_capget,
                capability_header.as_mut_ptr(),
                capability_sets.as_mut_ptr(),
            )
        };
        if result < 0 {
            panic!(
                "failed to verify Linux sandbox capabilities: {}",
                std::io::Error::last_os_error()
            );
        }
        if capability_sets
            .into_iter()
            .any(|[effective, permitted, _]| effective != 0 || permitted != 0)
        {
            panic!("Linux sandbox retained effective or permitted capabilities");
        }
```
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L235-257)
```rust
        let proxy_routing_active = allow_network_for_proxy;
        if let Err(e) = apply_permission_profile_to_current_thread(
            &permission_profile,
            &sandbox_policy_cwd,
            /*apply_landlock_fs*/ false,
            managed_network.as_ref(),
            proxy_routing_active,
        ) {
            panic!("error applying Linux sandbox restrictions: {e:?}");
        }

        let signal_mask = ForwardedSignalMask::block();
        let command_pid = unsafe { libc::fork() };
        if command_pid < 0 {
            let err = std::io::Error::last_os_error();
            panic!("failed to fork sandboxed command: {err}");
        }

        if command_pid == 0 {
            reset_forwarded_signal_handlers_to_default();
            signal_mask.restore();
            exec_or_panic(command);
        }
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L160-170)
```rust
        let (sandbox, windows_sandbox_level) = crate::sandbox_selection::select_sandbox(
            &sandbox_manager,
            permission_profile,
            sandbox_context,
            /*has_managed_network_requirements*/ false,
        );
        if sandbox == SandboxType::None {
            return Err(invalid_request(
                "filesystem sandbox cannot be enforced on this executor".to_string(),
            ));
        }
```