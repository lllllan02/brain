## Q8
Agent 主进程使用的 API key、环境变量、SSH agent、Docker socket 和云凭据，哪些会传入工具执行环境？是否存在外部代理代为认证？请区分“不把密钥交给程序”和“交给程序但禁止外传”。
### Answer
**简答**：存在外部代理代为认证——`codex-network-proxy` 的 `CredentialBroker` 就是为此设计的。受管理的凭据（`OPENAI_API_KEY`、`GH_TOKEN`、企业 token、以及 `credential_providers` 配置的厂商密钥）在传入子进程前被 `virtualize_child_credentials_for_environment` **替换为 dummy 值**，真实密钥只在代理侧按 host 绑定注入到出站请求——属于"不把密钥交给程序"。未被 broker 识别的普通环境变量仍原样传入沙箱进程（"交给程序"），其外传只能靠网络沙箱/域名白名单兜底。SSH agent 与 Docker socket 不是凭据注入对象，而是 Unix socket 访问问题：macOS 上 `GIT_SSH_COMMAND` 被改写为经 SOCKS 代理的 ssh；独立 `AF_UNIX` socket 在 ProxyRouted seccomp 下默认被拒，需 `allow_unix_sockets` 白名单 codex:514-526 codex:845-859 。

---

## 凭据如何进入工具执行环境

### 入口：`prepare_for_addrs` → `virtualize_child_credentials_for_environment`

每次 spawn 前，`NetworkProxy::apply_to_env`（经 `prepare_for_addrs`）做三件事：重写代理 env（`HTTP_PROXY`/`ALL_PROXY`/`GIT_SSH_COMMAND`/MITM CA 等）、注入 `PROXY_ATTRIBUTION_TOKEN`、调用 `virtualize_child_credentials_for_environment`——它先从**父进程 env** 发现凭据（`discover_parent_credentials_for_environment`），再把子 env 中的真实值替换成 dummy codex:1141-1158 codex:514-526 。该函数在 `UnifiedExecRuntime::run_attempt` 中经 `prepare_child_environment` 被调用 codex:393-407 。

虚拟化是**值级别**的：所有包含 `real_value`/`dummy_value` 的 env 值（含 `Bearer xxx` 形式、其他变量别名如 `HOMEBREW_GITHUB_API_TOKEN`）都被替换并记录 `CredentialAlias` codex:954-975 。

### 代理侧注入：按 host 绑定

`inject_request_headers(host, headers)` 只在请求目标匹配凭据的 `host_binding` 时把 dummy 换回真实值。测试表明：`sk-real` 只注入 `api.openai.com`/配置的 `OPENAI_BASE_URL`/`SDK base`，`attacker.example` 得到的仍是 dummy；`GH_ENTERPRISE_TOKEN` 绑定 `GH_HOST` 指向的 host codex:1412-1450 codex:1566-1596 。来源不明的嵌入凭据（如把真值粘进 `AUTH_HEADER`）也会被识别并按源 provider 规则校验 codex:376-435 。

### 快照与还原路径

Shell snapshot 捕获的 env 会先 `restore_brokered_credentials` 还原真值做发现，再以可信的 provider context（`replace_provider_context_with_trusted`）重建绑定后重新虚拟化——防止 shell 启动脚本里的 `GH_HOST=attacker.example` 重定向凭据目的地 codex:632-665 codex:732-762 。`restore_child_env`/`restore_and_disable_child_env` 用于可信捕获场景（如快照、fail-open），在 env 或文本中把 dummy 还原——这是例外路径，正常执行 env 保留 dummy codex:995-1015 codex:1232-1235 。

## 逐项对照

| 凭据/资源 | 进入子进程的形态 | 类别 |
|---|---|---|
| OpenAI API key | dummy 值；真值由代理注入 `api.openai.com`/配置 base url | 不交给程序 |
| GitHub token（`GH_TOKEN`/`GH_ENTERPRISE_TOKEN`/别名） | dummy；按 `GH_HOST`/`api.github.com` 绑定注入 | 不交给程序 |
| `credential_providers` 配置的厂商密钥（Stripe 等） | 同上，pattern+`url_prefix_from_env` 绑定；**无 resolved destination 时保持原值传入** codex:646-668  | 视配置 |
| 普通 env 变量/未识别密钥 | 原样传入（受 `ShellEnvironmentPolicy` 过滤） | 交给程序，外传靠域名白名单挡 |
| SSH | 无密钥转发；macOS 下 `GIT_SSH_COMMAND` 被包装为走 SOCKS 代理的 ssh，已有自定义 wrapper 则保留 codex:845-859 ；`SSH_AUTH_SOCK` 属 Unix socket，受 `allow_unix_sockets` 管控 | 交给程序 + 边界拦截 |
| Docker socket / 其他 Unix socket | 不注入；ProxyRouted seccomp 默认拒新建独立 `AF_UNIX` socket，`socketpair` 除外；需 `allow_unix_sockets`/`dangerously_allow_all_unix_sockets` codex:1196-1202  | 默认拒绝 |

## Notes

- `strip_managed_proxy_env`/`is_managed_proxy_env_var` 用于清理快照/上游 env 中残留的代理变量与 dummy，防止串扰 codex:681-705 。
- 远程 exec-server 时凭据经纪保持在控制端：`remote_launch_config` 生成 broker-only 配置（`set_allowed_domains(["*"])` + `credential_broker`），注入仍在本地代理完成 codex:940-954 。
- `dangerously_allow_plaintext_credential_injection` 是可关掉的明文注入逃生门。
- 关键限制：broker 只认已注册 provider 的 pattern；随便一个 `MY_SECRET=xxx` 不会被虚拟化——它属于"交给程序"一类。

Wiki pages you might want to explore:
- [Network Proxy (openai/codex)](/wiki/openai/codex#3.12)
- [Shell Execution Tools (openai/codex)](/wiki/openai/codex#5.2)

Wiki pages you might want to explore:
- [Network Proxy (openai/codex)](/wiki/openai/codex#3.12)
- [Shell Execution Tools (openai/codex)](/wiki/openai/codex#5.2)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
### Citations
**File:** codex-rs/network-proxy/src/runtime.rs (L514-526)
```rust
    pub(crate) fn virtualize_child_credentials_for_environment(
        &self,
        env: &mut HashMap<String, String>,
        environment_id: Option<&str>,
    ) {
        let parent_env = std::env::vars_os()
            .filter_map(|(key, value)| Some((key.into_string().ok()?, value.into_string().ok()?)))
            .collect();
        self.credential_broker
            .discover_parent_credentials_for_environment(&parent_env, env, environment_id);
        self.credential_broker
            .virtualize_child_env_for_environment(env, environment_id);
    }
```
**File:** codex-rs/network-proxy/src/proxy.rs (L681-705)
```rust
pub fn is_managed_proxy_env_var(key: &str, value: &str) -> bool {
    if PROXY_ENV_KEYS.contains(&key) {
        return true;
    }
    if crate::certs::CUSTOM_CA_ENV_KEYS.contains(&key) {
        return crate::certs::is_managed_mitm_ca_trust_bundle_path(value);
    }
    #[cfg(target_os = "macos")]
    {
        key == PROXY_GIT_SSH_COMMAND_ENV_KEY
            && value.starts_with(CODEX_PROXY_GIT_SSH_COMMAND_MARKER)
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

pub fn strip_managed_proxy_env(env: &mut HashMap<String, String>) {
    let brokered_credential_dummy_env_keys =
        crate::credential_broker::marked_credential_dummy_env_keys(env);
    env.retain(|key, value| {
        !brokered_credential_dummy_env_keys.contains(key) && !is_managed_proxy_env_var(key, value)
    });
}
```
**File:** codex-rs/network-proxy/src/proxy.rs (L845-859)
```rust
    #[cfg(target_os = "macos")]
    if socks_enabled {
        // Preserve existing SSH wrappers (for example: Secretive/Teleport setups)
        // but refresh a previously injected Codex fallback so it cannot point
        // at a stale proxy port after the proxy is restarted.
        match env.get(GIT_SSH_COMMAND_ENV_KEY) {
            Some(command) if !is_codex_proxy_git_ssh_command(command) => {}
            _ => {
                env.insert(
                    GIT_SSH_COMMAND_ENV_KEY.to_string(),
                    codex_proxy_git_ssh_command(socks_addr),
                );
            }
        }
    }
```
**File:** codex-rs/network-proxy/src/proxy.rs (L940-954)
```rust
        let (mut config, brokerage_created_default_allowlist, _) =
            self.state.current_cfg_with_brokerage_provenance().await?;
        // Proxy enablement and credential brokerage remain controller-owned.
        let mut broker_only_config = config::NetworkProxyConfig {
            enabled: config.enabled,
            allow_local_binding: config.allow_local_binding.filter(|binding| !binding),
            credential_providers: config.credential_providers.clone(),
            credential_broker_openai_host: config.credential_broker_openai_host.clone(),
            credential_broker_context: config.credential_broker_context.clone(),
            dangerously_allow_plaintext_credential_injection: config
                .dangerously_allow_plaintext_credential_injection,
            ..config::NetworkProxyConfig::default()
        };
        broker_only_config.set_credential_broker_enabled(/*enabled*/ true);
        broker_only_config.set_allowed_domains(vec!["*".to_string()]);
```
**File:** codex-rs/network-proxy/src/proxy.rs (L1141-1158)
```rust
        let runtime_settings = self.runtime_settings();
        // Enforce proxying for child processes. Proxy endpoint values are always rewritten;
        // managed MITM CA vars preserve child-scoped overrides after proxy startup.
        apply_proxy_env_overrides(
            &mut env,
            addrs.http_addr,
            addrs.socks_addr,
            self.socks_enabled,
            runtime_settings.allow_local_binding,
            runtime_settings.mitm_ca_trust_bundle.as_ref(),
        );
        let credential_environment_id = environment_id.or_else(|| {
            self.execution_scope
                .as_ref()
                .map(|scope| scope.environment_id.as_str())
        });
        self.state
            .virtualize_child_credentials_for_environment(&mut env, credential_environment_id);
```
**File:** codex-rs/network-proxy/src/proxy.rs (L1196-1202)
```rust
            sandbox_context: ManagedNetworkSandboxContext {
                loopback_ports,
                allow_local_binding: runtime_settings.allow_local_binding,
                allow_unix_sockets: runtime_settings.allow_unix_sockets.to_vec(),
                dangerously_allow_all_unix_sockets: runtime_settings
                    .dangerously_allow_all_unix_sockets,
            },
```
**File:** codex-rs/network-proxy/src/proxy.rs (L1232-1235)
```rust
    /// Prepares a snapshot for redaction, retaining dummies even for destinations that bypass
    /// the proxy. Actual child execution must use `apply_to_env` instead.
    pub fn apply_to_env_for_snapshot(&self, env: &mut HashMap<String, String>) {
        self.apply_to_env(env);
```
**File:** codex-rs/core/src/tools/runtimes/unified_exec.rs (L393-407)
```rust
            Some(network) => {
                let prepared = snapshot_credential_context
                    .unwrap_or_default()
                    .prepare_child_environment(
                        network,
                        env,
                        Some(&req.turn_environment.selection.environment_id),
                    )
                    .map_err(|err| {
                        ToolError::Codex(CodexErr::Io(io::Error::other(format!(
                            "failed to prepare network proxy for environment `{}`: {err}",
                            req.turn_environment.selection.environment_id
                        ))))
                    })?;
                (prepared.env, Some(prepared.sandbox_context), None)
```
**File:** codex-rs/network-proxy/src/credential_broker.rs (L954-975)
```rust
        for (key, value) in env.iter_mut() {
            if crate::is_managed_proxy_env_var(key, value) {
                continue;
            }
            let mut replacements = Replacements::default();
            for credential in &credentials {
                for original in [&credential.real_value, &credential.dummy_value] {
                    replacements.add(
                        credential.value_match_ranges(value, original),
                        &credential.dummy_value,
                        Some(credential),
                    );
                }
            }
            if replacements.render(value) {
                credential_aliases.push(CredentialAlias {
                    env_var: key.clone(),
                    dummy_value: value.clone(),
                });
            }
        }
        for alias in credential_aliases {
```
**File:** codex-rs/network-proxy/src/credential_broker.rs (L995-1015)
```rust
    pub(crate) fn restore_child_env(
        &self,
        env: &mut HashMap<String, String>,
        _command: &mut [String],
    ) {
        let state = self.read_state();
        if !state.enabled || env_value(env, CREDENTIAL_BROKER_ACTIVE_ENV_KEY) != Some("1") {
            return;
        }
        state.restore_child_env(env, |_| true);
    }

    pub(crate) fn restore_and_disable_child_env(
        &self,
        env: &mut HashMap<String, String>,
        command: &mut [String],
    ) {
        self.restore_child_env(env, command);
        remove_env_value(env, CREDENTIAL_BROKER_ACTIVE_ENV_KEY);
        remove_env_value(env, BROKERED_CREDENTIALS_ENV_KEY);
    }
```
**File:** codex-rs/network-proxy/src/credential_broker_tests.rs (L1412-1450)
```rust
fn openai_credentials_bind_only_to_default_and_configured_trusted_hosts() {
    let broker = CredentialBroker::new(/*enabled*/ true);
    let mut config = NetworkProxyConfig::default();
    config.set_credential_broker_enabled(/*enabled*/ true);
    config.set_credential_broker_openai_base_url(
        /*base_url*/ Some("https://gateway.example.com./v1"),
    );
    broker.configure(&config);

    let mut env = env_map([
        ("OPENAI_API_KEY", "sk-real"),
        ("OPENAI_BASE_URL", "https://sdk.example.com./v1"),
        ("GH_TOKEN", "ghp-real"),
    ]);
    broker.virtualize_child_env(&mut env);
    assert!(brokered_credential_env_keys(&env).any(|key| key == "OPENAI_BASE_URL"));
    assert!(brokered_credential_binding_env_keys(&env).any(|key| key == "OPENAI_BASE_URL"));
    let dummy = &env["OPENAI_API_KEY"];

    for (host, expected_credential) in [
        ("api.openai.com", "sk-real"),
        ("gateway.example.com", "sk-real"),
        ("sdk.example.com", "sk-real"),
        ("attacker.example", dummy.as_str()),
    ] {
        let mut headers = headers_with_bearer(dummy);
        assert_eq!(
            broker.request_matches_hooked_host_alias(
                host,
                &headers,
                &["api.openai.com".to_string()],
                /*environment_id*/ None,
            ),
            host != "api.openai.com" && expected_credential == "sk-real",
        );
        broker.inject_request_headers(host, &mut headers);
        let expected = format!("Bearer {expected_credential}");
        assert_eq!(authorization(&headers), Some(expected.as_str()), "{host}");
    }
```
**File:** codex-rs/network-proxy/src/credential_broker_tests.rs (L1566-1596)
```rust
fn github_enterprise_credentials_bind_to_gh_host() {
    for (hint, host) in [
        (" GitHub.Example.Com.:8443 ", "github.example.com"),
        ("127.0.0.1:8443", "127.0.0.1"),
        ("[::1]:8443", "::1"),
        ("::1", "::1"),
        ("[fe80::1%en0]:8443", "fe80::1%en0"),
        ("fe80::1%en0", "fe80::1%en0"),
    ] {
        let broker = CredentialBroker::new(/*enabled*/ true);
        let mut env = env_map([
            ("GH_HOST", hint),
            ("GH_ENTERPRISE_TOKEN", "ghp-enterprise-real"),
        ]);
        broker.virtualize_child_env(&mut env);
        let dummy = env["GH_ENTERPRISE_TOKEN"].clone();
        assert_ne!(dummy, "ghp-enterprise-real", "{hint}");
        env.remove("GH_HOST");
        env.insert(
            "GH_ENTERPRISE_TOKEN".to_string(),
            "ghp-enterprise-real".to_string(),
        );
        broker.virtualize_child_env(&mut env);
        let mut headers = headers_with_bearer(&dummy);
        broker.inject_request_headers(host, &mut headers);
        assert_eq!(
            authorization(&headers),
            Some("Bearer ghp-enterprise-real"),
            "{hint}"
        );
    }
```
**File:** codex-rs/network-proxy/src/credential_broker/environment.rs (L376-435)
```rust
pub fn credential_broker_provider_sources_allowed(
    value: &str,
    virtualized: &str,
    source_env: &HashMap<String, String>,
    is_allowed: impl Fn(&str) -> bool,
) -> bool {
    let mut recognized = false;
    let allowed = providers::credential_providers()
        .filter(move |provider| {
            provider.credential_prefixes.iter().any(|prefix| {
                value.match_indices(*prefix).any(|(start, _)| {
                    matching::recognized_credential_match(provider, value, virtualized, start)
                        .is_some()
                })
            })
        })
        .all(|provider| {
            recognized = true;
            let actual_sources = provider
                .sources()
                .iter()
                .flat_map(|source| source.env_vars.iter().copied())
                .filter(|source| {
                    env_value(source_env, source).is_some_and(|source_value| {
                        source_value.len() >= provider.minimum_credential_len
                            && value.contains(source_value)
                    })
                })
                .collect::<Vec<_>>();
            let unattributed = provider.credential_prefixes.iter().any(|prefix| {
                value.match_indices(*prefix).any(|(start, _)| {
                    matching::recognized_credential_match(provider, value, virtualized, start)
                        .is_some_and(|credential| {
                            !actual_sources.iter().any(|source| {
                                env_value(source_env, source).is_some_and(|source_value| {
                                    credential == source_value
                                        || credential
                                            .strip_prefix(source_value)
                                            .is_some_and(|suffix| suffix.starts_with(['_', '-']))
                                })
                            })
                        })
                })
            });
            if actual_sources.is_empty() || unattributed {
                provider
                    .sources()
                    .iter()
                    .flat_map(|source| source.env_vars.iter().copied())
                    .all(&is_allowed)
            } else {
                actual_sources.iter().all(|source| {
                    actual_sources.iter().any(|equivalent| {
                        env_value(source_env, source) == env_value(source_env, equivalent)
                            && is_allowed(equivalent)
                    })
                })
            }
        });
    allowed && recognized
```
**File:** codex-rs/core/src/shell_snapshot.rs (L632-665)
```rust
    let policy = &credential_broker.shell_environment_policy;
    // Child visibility must not change the trusted destination of an inherited credential.
    let inherited_env = std::env::vars().collect();
    let network_config = credential_broker.network_proxy.current_cfg().await?;
    let inherited_env = network_config
        .credential_broker_context
        .with_fallbacks(&inherited_env);
    let mut restored_env = original_env.clone();
    credential_broker
        .network_proxy
        .restore_brokered_credentials(&mut restored_env, &mut []);
    let mut discovery_env = restored_env.clone();
    let provider_environment = credential_broker
        .network_proxy
        .credential_broker_environment(&discovery_env);
    let provider_context_keys = provider_environment.provider_context_keys;
    replace_provider_context_with_trusted(
        &mut discovery_env,
        &inherited_env,
        provider_context_keys.clone(),
        &provider_context_keys,
    );
    for (key, value) in &policy.r#set {
        if !contains_env_key(&discovery_env, key)
            || provider_context_keys
                .iter()
                .any(|context_key| context_key.eq_ignore_ascii_case(key))
        {
            insert_env_value(&mut discovery_env, key, value);
        }
    }
    credential_broker
        .network_proxy
        .apply_to_env_for_snapshot(&mut discovery_env);
```
**File:** codex-rs/core/src/shell_snapshot_tests.rs (L732-762)
```rust
async fn snapshot_discovers_and_redacts_shell_initialized_credentials() -> Result<()> {
    let dir = tempdir()?;
    let startup = dir.path().join("startup.sh");
    std::fs::write(
        &startup,
        "unset GITHUB_ENTERPRISE_TOKEN UNSET_AUTH_HEADER\n\
         export GH_TOKEN='ghp_shell_only_secret'\n\
         export AUTH_HEADER=\"Bearer $GH_TOKEN\"\n\
         declare -rx GITHUB_TOKEN='ghp_readonly_secret'\n\
         declare -rx HOMEBREW_GITHUB_API_TOKEN=\"$GITHUB_TOKEN\"\n\
         export GH_ENTERPRISE_TOKEN='ghp_enterprise_secret'\n\
         export GH_HOST='attacker.example'\n\
         export OPENAI_API_KEY='sk-proj-snapshot-secret'\n\
         export STRIPE_API_KEY='stripe_live_abcdefghijklmnopqrstuvwx'\n\
         export STRIPE_HOST='https://startup.stripe.example/v1'\n\
         export STRIPE_AUTH_HEADER=\"Bearer $STRIPE_API_KEY\"\n\
         export VENDOR_PASSWORD='pin_abcdefgh'\n\
         export VENDOR_AUTH_HEADER=\"Bearer $VENDOR_PASSWORD\"\n\
         export VENDOR_HOST='https://attacker.vendor.example/v2'\n\
         export LOCAL_TOKEN='local_abcdefghijklmnopqrstuvwx'\n\
         export LOCAL_URL='http://127.0.0.1:1234/v1'\n\
         export LOCAL_AUTH_HEADER=\"Bearer $LOCAL_TOKEN\"\n\
         unset LOCAL_TOKEN\n\
         export AUTH_BUNDLE=\"GitHub $GH_TOKEN\n\
         OpenAI $OPENAI_API_KEY\"\n\
         export OPENAI_BASE_URL='https://api.snapshot.example/v1'\n\
         export IDENTITY_SEEN=\"${OPENAI_IDENTITY_TOKEN_FILE-missing}\"\n\
         export EXCLUDED_PARENT_HOME=\"${HOME-missing}\"\n\
         export STARTUP_PATH_OVERRIDE_SEEN=\"${PATH%%:*}\"\n\
         export STARTUP_CORP_REGION_SEEN=\"${CORP_REGION-missing}\"\n\
         export STARTUP_NPM_TOKEN_SEEN=\"${NPM_TOKEN-missing}\"\n",
```
**File:** codex-rs/network-proxy/src/credential_broker/configured_tests.rs (L646-668)
```rust
#[test]
fn configured_provider_preserves_credentials_without_a_resolved_destination() {
    let token = "stripe_live_abcdefghijklmnopqrstuvwx";
    let broker = broker_for(CredentialProviderConfig {
        env: vec!["STRIPE_API_KEY".to_string()],
        patterns: vec!["^stripe_live_[a-z]{24}$".to_string()],
        url_prefix_from_env: Some("STRIPE_HOST".to_string()),
        ..CredentialProviderConfig::default()
    });
    let mut bound_env = HashMap::from([
        ("STRIPE_API_KEY".to_string(), token.to_string()),
        ("STRIPE_HOST".to_string(), "api.stripe.com".to_string()),
    ]);
    broker.virtualize_child_env(&mut bound_env);
    assert_ne!(bound_env["STRIPE_API_KEY"], token);

    let mut env = HashMap::from([("STRIPE_API_KEY".to_string(), token.to_string())]);

    broker.virtualize_child_env(&mut env);

    assert_eq!(env["STRIPE_API_KEY"], token);
    assert!(broker.environment(&env).credential_keys.is_empty());
}
```
