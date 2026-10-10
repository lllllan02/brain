## Q6
python task.py 启动 shell、编译器或后台进程后，哪些限制自动继承？依据是什么？超时、取消或主进程退出时，如何处理整个进程树？请指出清理逻辑与相关测试。
### Answer
**简答**：限制自动继承的依据是——Linux 上 bwrap 命名空间、`PR_SET_NO_NEW_PRIVS` 和 seccomp 过滤器在 `fork()` + `exec` 之前安装，因此对 `python` 派生的整个子进程树生效 codex:196-257 ；代理白名单靠环境变量继承，文件系统视图靠 mount namespace 共享。进程树清理用 **Unix 进程组**（`process_group(0)` + `kill_process_group`）和 **Windows Job Object**（`spawn_contained`），超时直接 `SIGKILL` 组，取消先 `SIGTERM` 给宽限期再升级 `SIGKILL`，父进程死亡由 `PR_SET_PDEATHSIG`（仅 Linux）和 `kill_on_drop` 兜底 codex:1-18 codex:1027-1082 。

---

## 哪些限制被子进程继承，依据是什么

### 内核级：自动继承（无法绕过）

| 限制 | 继承机制 |
|---|---|
| Linux 文件系统视图 + 网络命名空间 | bwrap `unshare` 后 fork+exec，所有后代共享同一 mount/net namespace |
| seccomp 过滤器 + `no_new_privs` | 在 `libc::fork()` **之前** `apply_permission_profile_to_current_thread`，过滤器随 exec 保留并传给孩子；fork 后子进程 `exec_or_panic` codex:235-257  |
| 能力集 | inner stage 先 `capget` 断言 effective/permitted 全为 0，非零直接 panic codex:203-225  |
| macOS Seatbelt profile | `sandbox-exec` 施加的 profile 对进程树内核级生效 |
| Windows 令牌 + ACL | 受限令牌由子进程继承；Job Object 成员关系由 `spawn_contained` 建立，测试验证立即子进程 `IsProcessInJob` 为真 codex:281-308  |

### 约定级：env 继承（可绕过但有底层兜底）

`HTTP_PROXY`/`ALL_PROXY`/MITM CA 经 `apply_proxy_env_overrides` 写入 env 传给后代；即使程序忽略代理变量，netns/seccomp/Seatbelt 仍在底层拦截。

## 进程树清理

### 进程组划分（spawn 时）

- `pre_exec` 中 `detach_from_tty()`（`setsid`，EPERM 时退化为 `setpgid`）让 shell 工具子进程成为新会话/组首领 codex:49-61 ；`process_group(0)` 也见于测试构造 codex:369-379 。
- Linux 上 `set_parent_death_signal` 调 `PR_SET_PDEATHSIG` + `getppid()` 复查防 fork/exec 竞态——父死则子收 SIGTERM codex:29-41 ，接入点在 `spawn_child_async` 的 `pre_exec` codex:94-116 。
- `cmd.kill_on_drop(true)` 保证 Child 被 drop 时杀直系子进程 codex:136-136 。

### 超时 / 取消 / Ctrl-C（`consume_output`）

- **超时**：`kill_child_process_group`（SIGKILL 组）+ `child.start_kill()`，合成退出码 `EXIT_CODE_SIGNAL_BASE + TIMEOUT_CODE` codex:1034-1042 。
- **取消**：先 `terminate_process_group`（SIGTERM）给 `CANCELLATION_TERMINATION_GRACE_PERIOD` 让进程做清理；期限内未退出或仍有成员则 `kill_process_group` 升级 SIGKILL codex:1043-1074 。
- **Ctrl-C**：直接 SIGKILL 组 codex:1078-1082 。
- **组信号被拒时**（macOS EPERM）：`terminate_process_group`/`signal_process_group_with_member_fallback` 回退到逐成员信号 codex:16-17 。

### 主进程退出 / exec-server stdio 端

`spawn_stdio_child_supervisor` 监控子进程：wait 返回后 `kill_process_tree` 收尾；收到 terminate 先 `terminate_process_tree`（Unix 组 SIGTERM / Windows 树杀），`STDIO_TERMINATION_GRACE_PERIOD` 超时后 `kill_process_tree` codex:160-197 codex:199-244 。

## 相关测试

| 场景 | 测试 |
|---|---|
| 超时杀死孙进程（`sleep 60 &` 后台） | `kill_child_process_group_kills_grandchildren_on_timeout` codex:1382-1445  |
| 取消时 SIGTERM 清理 + TERM-免疫子进程被升级杀 | `process_exec_tool_call_cancellation_allows_sigterm_cleanup` codex:1494-1512  |
| 首领退出后取消/超时清理持管道的后代 | `full_buffer_expiration_cleans_up_after_leader_exit` codex:347-443  |
| PTY terminate 杀同组后台子进程 | `pty_terminate_kills_background_children_in_same_process_group` codex:1325-1375  |
| terminate/drop 回收子进程 | `pipe_terminate_reaps_child`、`pipe_drop_reaps_child` codex:831-875  |
| 组信号 EPERM 回退逐成员 + 拒绝非法 pgid | `denied_group_signal_terminates_owned_descendants...` codex:17-94  |
| Windows Job 终止杀后代；正常退出保留后代；`spawn_contained` 归属 | windows_tests.rs codex:240-308  |
| Windows 沙箱正常退出后后代存活（有意行为） | `legacy_capture_emits_output_and_preserves_descendant_after_normal_exit` codex:666-734  |
| 父被 SIGKILL 后子进程死亡（pdeathsig + pidfd 验证） | `helper_target_dies_when_parent_is_killed` codex:130-174  |

## Notes

- **逃逸边界**：`setsid` 自行脱离会话的后台进程（daemon）不再属于该进程组，组信号打不到它；Windows 上正常退出**有意**保留后代（`normal_exit_preserves_descendants` 测试），只有 terminate/kill 才清树。`PR_SET_PDEATHSIG` 只影响直系子进程，孙进程靠进程组覆盖。
- MCP 服务器（非沙箱子进程）另有 `KillAndReap` drop 策略与进程组清理，见 `rmcp-client/tests/process_group_cleanup.rs`。
- bwrap 包装层自身用 `terminate_with_parent` + `install_bwrap_signal_forwarders` 把信号转发进沙箱并等待子退出 codex:585-634 。

Wiki pages you might want to explore:
- [Exec Server (openai/codex)](/wiki/openai/codex#4.7)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
- [MCP Server Implementation (codex-mcp-server) (openai/codex)](/wiki/openai/codex#6.4)
### Citations
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L196-257)
```rust
    // Inner stage: apply seccomp/no_new_privs after bubblewrap has already
    // established the filesystem view.
    if apply_seccomp_then_exec {
        if let Err(err) = crate::fd_mount::verify_fd_mounts(&verify_fd_mounts) {
            panic!("failed to verify descriptor-backed bubblewrap mount: {err}");
        }

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

        if allow_network_for_proxy {
            let spec = proxy_route_spec
                .as_deref()
                .unwrap_or_else(|| panic!("managed proxy mode requires --proxy-route-spec"));
            if let Err(err) = activate_proxy_routes_in_netns(spec) {
                panic!("error activating Linux proxy routing bridge: {err}");
            }
        }
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
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L585-634)
```rust
fn run_bwrap_in_child_with_synthetic_mount_cleanup(bwrap_args: crate::bwrap::BwrapArgs) -> ! {
    let crate::bwrap::BwrapArgs {
        args,
        preserved_files,
        synthetic_mount_targets,
        protected_create_targets,
    } = bwrap_args;
    let setup_signal_mask = ForwardedSignalMask::block();
    let synthetic_mount_registrations = register_synthetic_mount_targets(&synthetic_mount_targets);
    let protected_create_registrations =
        register_protected_create_targets(&protected_create_targets);
    let exec_start_pipe = create_exec_start_pipe(!protected_create_targets.is_empty());
    let parent_pid = unsafe { libc::getpid() };
    let pid = unsafe { libc::fork() };
    if pid < 0 {
        let err = std::io::Error::last_os_error();
        panic!("failed to fork for bubblewrap: {err}");
    }

    if pid == 0 {
        reset_forwarded_signal_handlers_to_default();
        setup_signal_mask.restore();
        let setpgid_res = unsafe { libc::setpgid(0, 0) };
        if setpgid_res < 0 {
            let err = std::io::Error::last_os_error();
            panic!("failed to place bubblewrap child in its own process group: {err}");
        }
        terminate_with_parent(parent_pid);
        wait_for_parent_exec_start(exec_start_pipe[0], exec_start_pipe[1]);
        exec_bwrap(args, preserved_files);
    }

    drop(preserved_files);
    close_child_exec_start_read(exec_start_pipe[0]);
    let protected_create_monitor = ProtectedCreateMonitor::start(&protected_create_targets);
    let signal_forwarders = install_bwrap_signal_forwarders(pid);
    release_child_exec_start(exec_start_pipe[1]);
    setup_signal_mask.restore();
    let status = wait_for_bwrap_child(pid);
    let cleanup_signal_mask = ForwardedSignalMask::block();
    BWRAP_CHILD_PID.store(0, Ordering::SeqCst);
    let protected_create_monitor_violation = protected_create_monitor
        .map(ProtectedCreateMonitor::stop)
        .unwrap_or(false);
    cleanup_synthetic_mount_targets(&synthetic_mount_registrations);
    let protected_create_violation = protected_create_monitor_violation
        || cleanup_protected_create_targets(&protected_create_registrations);
    signal_forwarders.restore();
    cleanup_signal_mask.restore();
    exit_with_wait_status_or_policy_violation(status, protected_create_violation);
```
**File:** codex-rs/utils/pty/src/process_group.rs (L1-18)
```rust
//! Process-group helpers shared by pipe/pty and shell command execution.
//!
//! This module centralizes the OS-specific pieces that ensure a spawned
//! command can be cleaned up reliably:
//! - `set_process_group` is called in `pre_exec` so the child starts its own
//!   process group.
//! - `detach_from_tty` starts a new session so non-interactive children do not
//!   inherit the controlling TTY.
//! - `kill_process_group_by_pid` targets the whole group (children/grandchildren)
//! - `kill_process_group` targets a known process group ID directly
//!   instead of a single PID.
//! - `set_parent_death_signal` (Linux only) arranges for the child to receive a
//!   `SIGTERM` when the parent exits, and re-checks the parent PID to avoid
//!   races during fork/exec.
//!
//! On macOS, `terminate_process_group` and `kill_process_group` retry denied
//! group signals against individual members.
//! On non-Unix platforms these helpers are no-ops.
```
**File:** codex-rs/utils/pty/src/process_group.rs (L29-41)
```rust
pub fn set_parent_death_signal(parent_pid: libc::pid_t) -> io::Result<()> {
    if unsafe { libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM) } == -1 {
        return Err(io::Error::last_os_error());
    }

    if unsafe { libc::getppid() } != parent_pid {
        unsafe {
            libc::raise(libc::SIGTERM);
        }
    }

    Ok(())
}
```
**File:** codex-rs/utils/pty/src/process_group.rs (L49-61)
```rust
#[cfg(unix)]
/// Detach from the controlling TTY by starting a new session.
pub fn detach_from_tty() -> io::Result<()> {
    let result = unsafe { libc::setsid() };
    if result == -1 {
        let err = io::Error::last_os_error();
        if err.raw_os_error() == Some(libc::EPERM) {
            return set_process_group();
        }
        return Err(err);
    }
    Ok(())
}
```
**File:** codex-rs/core/src/exec.rs (L1027-1082)
```rust
    let (mut exit_status, mut timed_out) = tokio::select! {
        status_result = child.wait() => {
            let exit_status = status_result?;
            (exit_status, false)
        }
        outcome = &mut expiration_wait => {
            expiration_resolved = true;
            match outcome {
                Some(ExecExpirationOutcome::TimedOut) => {
                    kill_child_process_group(&mut child)?;
                    child.start_kill()?;
                    (
                        synthetic_exit_status(EXIT_CODE_SIGNAL_BASE + TIMEOUT_CODE),
                        true,
                    )
                }
                Some(ExecExpirationOutcome::Cancelled) => {
                    // Let TERM-aware processes run cleanup briefly, then kill any
                    // remaining members of the original process group.
                    let process_group_id = child.id();
                    let should_escalate = if let Some(process_group_id) = process_group_id {
                        terminate_process_group(process_group_id)?
                    } else {
                        false
                    };
                    match tokio::time::timeout(
                        CANCELLATION_TERMINATION_GRACE_PERIOD,
                        child.wait(),
                    )
                    .await
                    {
                        Ok(status) => {
                            status?;
                            if should_escalate
                                && let Some(process_group_id) = process_group_id
                            {
                                kill_process_group(process_group_id)?;
                            }
                        }
                        Err(_) => {
                            if let Some(process_group_id) = process_group_id {
                                kill_process_group(process_group_id)?;
                            }
                            child.start_kill()?;
                        }
                    }
                    (synthetic_exit_status_for_code(/*code*/ 1), false)
                }
                None => unreachable!("expiration wait only resolves while expiration is active"),
            }
        }
        _ = tokio::signal::ctrl_c() => {
            kill_child_process_group(&mut child)?;
            child.start_kill()?;
            (synthetic_exit_status(EXIT_CODE_SIGNAL_BASE + SIGKILL_CODE), false)
        }
```
**File:** codex-rs/utils/pty/src/windows_tests.rs (L240-308)
```rust
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn terminate_kills_descendants_for_best_effort_pipe_and_atomic_conpty() -> anyhow::Result<()>
{
    let Some(python) = find_python() else {
        eprintln!("python not found; skipping Windows process-tree termination test");
        return Ok(());
    };
    let env: HashMap<String, String> = std::env::vars().collect();
    assert_terminate_kills_descendant("pipe", &python, &env).await?;
    assert_terminate_kills_descendant("ConPTY", &python, &env).await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn normal_exit_preserves_descendants_for_pipe_and_conpty() -> anyhow::Result<()> {
    let Some(python) = find_python() else {
        eprintln!("python not found; skipping Windows process-tree natural-exit test");
        return Ok(());
    };
    let env: HashMap<String, String> = std::env::vars().collect();
    assert_normal_exit_preserves_descendant("pipe", &python, &env).await?;
    assert_normal_exit_preserves_descendant("ConPTY", &python, &env).await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn contained_spawn_owns_immediate_descendant() -> anyhow::Result<()> {
    let Some(python) = find_python() else {
        eprintln!("python not found; skipping Windows contained-spawn test");
        return Ok(());
    };

    let mut command = Command::new(&python);
    command
        .args([
            "-u",
            "-c",
            "import subprocess,sys; child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); print(child.pid,flush=True); child.wait()",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

    let job = crate::JobObject::create()?;
    let mut root = job.spawn_contained(&mut command)?;
    let stdout = root
        .stdout
        .take()
        .ok_or_else(|| anyhow::anyhow!("missing contained process stdout"))?;
    let mut stdout = BufReader::new(stdout);
    let mut child_pid = String::new();
    tokio::time::timeout(Duration::from_secs(10), stdout.read_line(&mut child_pid)).await??;
    let child_pid: u32 = child_pid.trim().parse()?;

    let process = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, child_pid) };
    anyhow::ensure!(!process.is_null(), "failed to open immediate child process");
    let process = unsafe { OwnedHandle::from_raw_handle(process.cast()) };
    let mut in_job = 0;
    let checked = unsafe {
        IsProcessInJob(
            process.as_raw_handle().cast(),
            job.as_raw_handle().cast(),
            &mut in_job,
        )
    };
    anyhow::ensure!(checked != 0, "failed to inspect child Job Object");
    anyhow::ensure!(in_job != 0, "immediate child escaped its Job Object");

    job.terminate()?;
    tokio::time::timeout(Duration::from_secs(10), root.wait()).await??;
    Ok(())
```
**File:** codex-rs/core/src/exec_tests.rs (L347-443)
```rust
#[cfg(unix)]
#[test_case("stdout", CaptureDrainFailure::Cancellation, ExecCapturePolicy::FullBufferWithExpiration; "cancel_stdout")]
#[test_case("stderr", CaptureDrainFailure::Cancellation, ExecCapturePolicy::FullBufferWithExpiration; "cancel_stderr")]
#[test_case("stdout", CaptureDrainFailure::Timeout, ExecCapturePolicy::FullBufferWithExpiration; "timeout_stdout")]
#[test_case("stderr", CaptureDrainFailure::Timeout, ExecCapturePolicy::FullBufferWithExpiration; "timeout_stderr")]
#[test_case("stdout", CaptureDrainFailure::DrainTimeout, ExecCapturePolicy::FullBufferWithExpiration; "incomplete_stdout")]
#[test_case("stderr", CaptureDrainFailure::DrainTimeout, ExecCapturePolicy::FullBufferWithExpiration; "incomplete_stderr")]
#[test_case("stdout", CaptureDrainFailure::Cancellation, ExecCapturePolicy::SensitiveFullBuffer; "sensitive_cancel")]
#[test_case("stderr", CaptureDrainFailure::Timeout, ExecCapturePolicy::SensitiveFullBuffer; "sensitive_timeout")]
#[test_case("stdout", CaptureDrainFailure::DrainTimeout, ExecCapturePolicy::SensitiveFullBuffer; "sensitive_drain_timeout")]
#[tokio::test]
async fn full_buffer_expiration_cleans_up_after_leader_exit(
    pipe: &str,
    failure: CaptureDrainFailure,
    capture_policy: ExecCapturePolicy,
) -> anyhow::Result<()> {
    let dir = tempfile::tempdir()?;
    let redirect = match pipe {
        "stdout" => "2>/dev/null",
        "stderr" => ">/dev/null",
        _ => unreachable!("test specifies stdout or stderr"),
    };
    let mut command = tokio::process::Command::new("/bin/sh");
    command
        .args(["-c", &format!(
            "printf complete; (while [ ! -f release ]; do sleep 0.01; done; printf survived > late_write) {redirect} &"
        )])
        .current_dir(dir.path())
        .process_group(/*pgroup*/ 0)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true);
    let child = command.spawn()?;
    let process_group_id = child.id().expect("running child");
    let cancellation = CancellationToken::new();
    let expiration = match failure {
        CaptureDrainFailure::Cancellation => ExecExpiration::Cancellation(cancellation.clone()),
        CaptureDrainFailure::Timeout => ExecExpiration::Timeout(Duration::from_millis(250)),
        CaptureDrainFailure::DrainTimeout => ExecExpiration::Timeout(Duration::from_secs(30)),
    };
    let capture = consume_output(
        child,
        expiration,
        capture_policy,
        /*stdout_stream*/ None,
    );
    let after_leader_exit = async {
        timeout(Duration::from_secs(5), async {
            while unsafe {
                libc::kill(process_group_id as libc::pid_t, /*sig*/ 0)
            } == 0
            {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("capture should reap the direct child before cancellation");
        if matches!(failure, CaptureDrainFailure::Cancellation) {
            cancellation.cancel();
        }
    };
    let (result, ()) = timeout(Duration::from_secs(6), async {
        tokio::join!(capture, after_leader_exit)
    })
    .await?;
    std::fs::write(dir.path().join("release"), "")?;
    tokio::time::sleep(Duration::from_millis(100)).await;
    let survived = dir.path().join("late_write").exists();
    codex_utils_pty::process_group::kill_process_group(process_group_id)?;
    assert!(
        !survived,
        "pipe-holding descendant survived capture failure"
    );
    match failure {
        CaptureDrainFailure::Cancellation | CaptureDrainFailure::Timeout => {
            let output = result?;
            assert_eq!(
                (
                    output.timed_out,
                    output.exit_status.success(),
                    output.stdout.text,
                    output.stderr.text
                ),
                (
                    matches!(failure, CaptureDrainFailure::Timeout),
                    false,
                    Vec::new(),
                    Vec::new()
                ),
            );
        }
        CaptureDrainFailure::DrainTimeout => {
            assert!(result.is_err(), "incomplete capture must fail");
        }
    }
    Ok(())
}
```
**File:** codex-rs/core/src/exec_tests.rs (L1382-1445)
```rust
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
```
**File:** codex-rs/core/src/exec_tests.rs (L1494-1512)
```rust
#[cfg(unix)]
#[tokio::test]
async fn process_exec_tool_call_cancellation_allows_sigterm_cleanup() -> Result<()> {
    let temp_dir = tempfile::TempDir::new()?;
    let ready_marker = temp_dir.path().join("ready");
    let cleanup_marker = temp_dir.path().join("cleanup");
    let descendant_pid_marker = temp_dir.path().join("descendant-pid");
    // The parent handles TERM and records cleanup, while a TERM-ignoring child
    // proves cancellation still escalates any survivors in the process group.
    let command = vec![
        "/bin/sh".to_string(),
        "-c".to_string(),
        r#"(trap '' TERM; sleep 60) &
printf '%s' "$!" > "$DESCENDANT_PID_MARKER"
trap 'printf cleaned > "$CLEANUP_MARKER"; exit 0' TERM
printf ready > "$READY_MARKER"
while :; do sleep 1; done"#
            .to_string(),
    ];
```
**File:** codex-rs/core/src/spawn.rs (L94-116)
```rust
    #[cfg(unix)]
    unsafe {
        let detach_from_tty = matches!(stdio_policy, StdioPolicy::RedirectForShellTool);
        #[cfg(target_os = "linux")]
        let parent_pid = libc::getpid();
        cmd.pre_exec(move || {
            if detach_from_tty {
                codex_utils_pty::process_group::detach_from_tty()?;
            }

            // This relies on prctl(2), so it only works on Linux.
            #[cfg(target_os = "linux")]
            {
                // This prctl call effectively requests, "deliver SIGTERM when my
                // current parent dies."
                codex_utils_pty::process_group::set_parent_death_signal(parent_pid)?;
            }
            // Close descriptors accidentally inherited by the child.
            #[cfg(target_os = "macos")]
            codex_utils_pty::pty::close_inherited_fds_except(&[]);
            Ok(())
        });
    }
```
**File:** codex-rs/core/src/spawn.rs (L136-136)
```rust
    cmd.kill_on_drop(true).spawn()
```
**File:** codex-rs/exec-server/src/connection.rs (L160-197)
```rust
fn spawn_stdio_child_supervisor(mut child_process: Child, mut terminate_rx: watch::Receiver<bool>) {
    let process_group_id = child_process.id();
    tokio::spawn(async move {
        tokio::select! {
            result = child_process.wait() => {
                log_stdio_child_wait_result(result);
                kill_process_tree(&mut child_process, process_group_id);
            }
            () = wait_for_stdio_termination(&mut terminate_rx) => {
                terminate_stdio_child(&mut child_process, process_group_id).await;
            }
        }
    });
}

async fn wait_for_stdio_termination(terminate_rx: &mut watch::Receiver<bool>) {
    loop {
        if *terminate_rx.borrow() {
            return;
        }
        if terminate_rx.changed().await.is_err() {
            return;
        }
    }
}

async fn terminate_stdio_child(child_process: &mut Child, process_group_id: Option<u32>) {
    terminate_process_tree(child_process, process_group_id);
    match timeout(STDIO_TERMINATION_GRACE_PERIOD, child_process.wait()).await {
        Ok(result) => {
            log_stdio_child_wait_result(result);
        }
        Err(_) => {
            kill_process_tree(child_process, process_group_id);
            log_stdio_child_wait_result(child_process.wait().await);
        }
    }
}
```
**File:** codex-rs/exec-server/src/connection.rs (L199-244)
```rust
fn terminate_process_tree(child_process: &mut Child, process_group_id: Option<u32>) {
    let Some(process_group_id) = process_group_id else {
        kill_direct_child(child_process, "terminate");
        return;
    };

    #[cfg(unix)]
    if let Err(err) = codex_utils_pty::process_group::terminate_process_group(process_group_id) {
        warn!("failed to terminate exec-server stdio process group {process_group_id}: {err}");
        kill_direct_child(child_process, "terminate");
    }

    #[cfg(windows)]
    if !kill_windows_process_tree(process_group_id) {
        kill_direct_child(child_process, "terminate");
    }

    #[cfg(not(any(unix, windows)))]
    {
        let _ = process_group_id;
        kill_direct_child(child_process, "terminate");
    }
}

fn kill_process_tree(child_process: &mut Child, process_group_id: Option<u32>) {
    let Some(process_group_id) = process_group_id else {
        kill_direct_child(child_process, "kill");
        return;
    };

    #[cfg(unix)]
    if let Err(err) = codex_utils_pty::process_group::kill_process_group(process_group_id) {
        warn!("failed to kill exec-server stdio process group {process_group_id}: {err}");
    }

    #[cfg(windows)]
    if !kill_windows_process_tree(process_group_id) {
        kill_direct_child(child_process, "kill");
    }

    #[cfg(not(any(unix, windows)))]
    {
        let _ = process_group_id;
        kill_direct_child(child_process, "kill");
    }
}
```
**File:** codex-rs/utils/pty/src/tests.rs (L831-875)
```rust
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pipe_terminate_reaps_child() -> anyhow::Result<()> {
    let env_map: HashMap<String, String> = std::env::vars().collect();
    let command = if cfg!(windows) {
        "ping -n 60 127.0.0.1 > NUL"
    } else {
        "sleep 60"
    };
    let (program, args) = shell_command(command);
    let spawned = spawn_pipe_process(&program, &args, Path::new("."), &env_map, &None, &[]).await?;
    let (session, _output_rx, exit_rx) = combine_spawned_output(spawned);

    session.terminate();

    let exit_code = tokio::time::timeout(tokio::time::Duration::from_secs(5), exit_rx)
        .await
        .map_err(|_| anyhow::anyhow!("timed out waiting for terminated child to be reaped"))?
        .map_err(|_| anyhow::anyhow!("child waiter was aborted before reaping"))?;
    assert_eq!(session.exit_code(), Some(exit_code));
    assert!(session.has_exited());

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pipe_drop_reaps_child() -> anyhow::Result<()> {
    let env_map: HashMap<String, String> = std::env::vars().collect();
    let command = if cfg!(windows) {
        "ping -n 60 127.0.0.1 > NUL"
    } else {
        "sleep 60"
    };
    let (program, args) = shell_command(command);
    let spawned = spawn_pipe_process(&program, &args, Path::new("."), &env_map, &None, &[]).await?;
    let (session, _output_rx, exit_rx) = combine_spawned_output(spawned);

    drop(session);

    tokio::time::timeout(tokio::time::Duration::from_secs(5), exit_rx)
        .await
        .map_err(|_| anyhow::anyhow!("timed out waiting for dropped child to be reaped"))?
        .map_err(|_| anyhow::anyhow!("child waiter was aborted before reaping"))?;

    Ok(())
}
```
**File:** codex-rs/utils/pty/src/tests.rs (L1325-1375)
```rust
#[cfg(unix)]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn pty_terminate_kills_background_children_in_same_process_group() -> anyhow::Result<()> {
    let env_map: HashMap<String, String> = std::env::vars().collect();
    let marker = "__codex_bg_pid:";
    let script = format!("sleep 1000 & bg=$!; echo {marker}$bg; wait");
    let (program, args) = shell_command(&script);
    let spawned = spawn_pty_process(
        &program,
        &args,
        Path::new("."),
        &env_map,
        &None,
        TerminalSize::default(),
        crate::ChildFds::Inherited(&[]),
    )
    .await?;
    let (session, mut output_rx, exit_rx) = combine_spawned_output(spawned);

    let bg_pid = match wait_for_marker_pid(&mut output_rx, marker, /*timeout_ms*/ 2_000).await {
        Ok(pid) => pid,
        Err(err) => {
            session.terminate();
            return Err(err);
        }
    };
    assert!(
        process_exists(bg_pid)?,
        "expected background child pid {bg_pid} to exist before terminate"
    );

    session.terminate();

    tokio::time::timeout(tokio::time::Duration::from_secs(3), exit_rx)
        .await
        .map_err(|_| anyhow::anyhow!("timed out waiting for terminated PTY child to be reaped"))?
        .map_err(|_| anyhow::anyhow!("PTY child waiter was aborted before reaping"))?;
    assert!(session.has_exited());

    let exited = wait_for_process_exit(bg_pid, /*timeout_ms*/ 3_000).await?;
    if !exited {
        let _ = unsafe { libc::kill(bg_pid, libc::SIGKILL) };
    }

    assert!(
        exited,
        "background child pid {bg_pid} survived PTY terminate()"
    );

    Ok(())
}
```
**File:** codex-rs/utils/pty/src/process_group_tests.rs (L17-94)
```rust
#[tokio::test]
async fn denied_group_signal_terminates_owned_descendants_and_preserves_escalation() -> Result<()> {
    for leader_exited in [false, true] {
        let mut wrapper = Command::new("/bin/sh")
            .args([
                "-c",
                "trap '' TERM; /bin/sleep 30 & resistant=$!; trap - TERM; /bin/sleep 30 & sibling=$!; printf '%s %s\\n' \"$resistant\" \"$sibling\"; wait",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .kill_on_drop(true)
            .process_group(0)
            .spawn()?;
        let process_group_id =
            wrapper.id().context("wrapper process has no process ID")? as libc::pid_t;
        let stdout = wrapper.stdout.take().context("wrapper has no stdout")?;
        let line = timeout(
            Duration::from_secs(5),
            BufReader::new(stdout).lines().next_line(),
        )
        .await??
        .context("missing descendant IDs")?;
        let (resistant_pid, sibling_pid) =
            line.split_once(' ').context("invalid descendant IDs")?;
        let resistant_pid = resistant_pid.parse::<libc::pid_t>()?;
        let sibling_pid = sibling_pid.parse::<libc::pid_t>()?;

        if leader_exited {
            wrapper.kill().await?;
        }

        let mut denied_leader = false;
        for signal in [libc::SIGTERM, libc::SIGKILL] {
            assert!(signal_process_group_with_member_fallback(
                process_group_id as u32,
                signal,
                |_, _| Err(io::Error::from_raw_os_error(libc::EPERM)),
                |process_id, signal| {
                    if process_id == process_group_id {
                        denied_leader = true;
                        Err(io::Error::from_raw_os_error(libc::EPERM))
                    } else {
                        signal_process_id(process_id, signal)
                    }
                },
            )?);
            if signal == libc::SIGTERM {
                assert_eq!(denied_leader, !leader_exited);
                assert!(signal_process_id(resistant_pid, /*signal*/ 0)?);
            }
        }

        for process_id in [resistant_pid, sibling_pid] {
            timeout(Duration::from_secs(5), async move {
                while signal_process_id(process_id, /*signal*/ 0)? {
                    tokio::time::sleep(Duration::from_millis(20)).await;
                }
                Ok::<(), io::Error>(())
            })
            .await??;
        }

        if !leader_exited {
            timeout(Duration::from_secs(5), wrapper.wait()).await??;
        }
    }

    Ok(())
}

#[test]
fn denied_group_signal_rejects_unsafe_process_group_ids() {
    for process_group_id in [0, u32::MAX] {
        let error = terminate_process_group(process_group_id)
            .expect_err("unsafe process group ID should be rejected");
        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    }
}
```
**File:** codex-rs/windows-sandbox-rs/src/unified_exec/tests.rs (L666-734)
```rust
#[test]
fn legacy_capture_emits_output_and_preserves_descendant_after_normal_exit() {
    let Some(pwsh) = pwsh_path() else {
        return;
    };
    let _guard = legacy_process_test_guard();
    let cwd = sandbox_cwd();
    let codex_home = sandbox_home("legacy-capture-pwsh");
    println!("capture pwsh codex_home={}", codex_home.path().display());
    let ready_marker = codex_home.path().join("descendant-started");
    let release_marker = codex_home.path().join("release-descendant");
    let survival_marker = codex_home.path().join("descendant-survived");
    let descendant_command = format!(
        "$deadline=(Get-Date).AddSeconds(30); Set-Content -LiteralPath '{}' -Value $PID; while (-not (Test-Path -LiteralPath '{}')) {{ if ((Get-Date) -ge $deadline) {{ exit 3 }}; Start-Sleep -Milliseconds 25 }}; Set-Content -LiteralPath '{}' -Value survived",
        powershell_literal(&ready_marker),
        powershell_literal(&release_marker),
        powershell_literal(&survival_marker),
    );
    let parent_tail = format!(
        "while (-not (Test-Path -LiteralPath '{}')) {{ Start-Sleep -Milliseconds 25 }}",
        powershell_literal(&ready_marker),
    );
    let parent_command = format!(
        "{ASSERT_NO_CONSOLE} Write-Output LEGACY-CAPTURE-DIRECT; {}",
        start_powershell_child(&pwsh, codex_home.path(), &descendant_command, &parent_tail,),
    );
    let permission_profile = PermissionProfile::workspace_write();
    let result = run_windows_sandbox_capture(
        &permission_profile,
        workspace_roots_for(cwd.as_path()).as_slice(),
        codex_home.path(),
        vec![
            pwsh.display().to_string(),
            "-NoProfile".to_string(),
            "-Command".to_string(),
            parent_command,
        ],
        cwd.as_path(),
        HashMap::new(),
        Some(10_000),
        /*cancellation*/ None,
    )
    .expect("run legacy capture powershell");
    let descendant_pid = fs::read_to_string(&ready_marker)
        .expect("read descendant pid")
        .trim()
        .parse()
        .expect("parse descendant pid");
    let descendant_process = open_process_for_wait(descendant_pid);
    fs::write(&release_marker, "release").expect("release descendant after root exit");
    let descendant_process = descendant_process.expect("open descendant after normal capture exit");

    println!("capture pwsh exit_code={}", result.exit_code);
    println!("capture pwsh timed_out={}", result.timed_out);
    let stdout = String::from_utf8_lossy(&result.stdout);
    let stderr = String::from_utf8_lossy(&result.stderr);
    println!("capture pwsh stderr={stderr:?}");
    assert_eq!(result.exit_code, 0, "stdout={stdout:?} stderr={stderr:?}");
    assert!(
        stdout.contains("LEGACY-CAPTURE-DIRECT"),
        "stdout={stdout:?}"
    );
    assert!(
        wait_for_path(&survival_marker, Duration::from_secs(10)),
        "sandbox descendant did not survive normal capture exit"
    );
    wait_for_process_exit(&descendant_process, Duration::from_secs(10))
        .expect("sandbox descendant did not exit after release");
}
```
**File:** codex-rs/utils/pty/src/spawn_helper_tests.rs (L130-174)
```rust
#[tokio::test]
async fn helper_target_dies_when_parent_is_killed() -> anyhow::Result<()> {
    use tokio::io::AsyncBufReadExt;
    if !Path::new("/proc/self/exe").exists() || process_arguments().is_err() {
        eprintln!("skipping parent-death test: procfs is unavailable");
        return Ok(());
    }
    // Check support and sandbox permissions before creating fixtures.
    match open_pidfd(std::process::id() as _) {
        Ok(_) => {}
        Err(error)
            if matches!(
                error.raw_os_error(),
                Some(libc::ENOSYS | libc::EPERM | libc::EACCES)
            ) =>
        {
            eprintln!("skipping parent-death test: pidfd_open is unavailable");
            return Ok(());
        }
        Err(error) => return Err(error.into()),
    }
    let mut parent = tokio::process::Command::new(std::env::current_exe()?)
        .arg(PARENT_FIXTURE)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .kill_on_drop(true)
        .spawn()?;
    // Keep the cleanup pipe open independently of the parent's lifetime.
    let cleanup = parent.stdin.take().expect("parent fixture stdin is piped");
    let mut output = tokio::io::BufReader::new(parent.stdout.take().unwrap()).lines();
    let pid = tokio::time::timeout(Duration::from_secs(5), output.next_line())
        .await??
        .expect("child reports its PID after verifying PDEATHSIG")
        .parse::<libc::pid_t>()?;
    // The fixture child waits on the cleanup pipe while its parent is alive.
    let child = tokio::io::unix::AsyncFd::new(open_pidfd(pid)?)?;
    parent.kill().await?;
    let stopped = tokio::time::timeout(Duration::from_secs(5), child.readable()).await;
    drop(cleanup);
    if stopped.is_err() {
        drop(tokio::time::timeout(Duration::from_secs(5), child.readable()).await??);
    }
    drop(stopped??);
    Ok(())
}
```
