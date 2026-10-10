## Q10
请找出验证沙箱边界的集成测试：越界文件访问、禁止联网、子进程继承、资源超限、失败清理。哪些测试真正启动受限进程，哪些只检查生成的配置？哪些安全属性在本仓库中没有验证证据？
### Answer
## 直接回答

**本仓库没有任何验证沙箱边界的集成测试**——没有测试会真正 spawn 受限进程来验证越界文件访问、禁止联网、子进程继承或资源超限。唯一接近的验证代码是 `.devcontainer/init-firewall.sh` 末尾的**启动时自检**（`curl example.com` 必须失败、`curl api.github.com` 必须通），而仓库中唯一的测试套件 `mods/diff/tests/` 全部基于 mock harness，不创建真实子进程。 claude-code:122-136 claude-code:1016-1036 

---

## 仓库中实际存在的"测试"盘点

### 1. `init-firewall.sh` 自检——唯一真实验证网络的代码
这不是测试框架，而是 devcontainer `postStartCommand` 的运行时断言：防火墙配好后立即 `curl https://example.com` 预期失败、`curl https://api.github.com/zen` 预期成功，失败则 `exit 1`。 claude-code:122-136 claude-code:55-56 
- 它验证的是 **iptables/ipset 规则生效**（真流量），但只在容器启动时跑，不是 CI 测试。

### 2. `mods/diff/tests/register.test.ts`——纯 mock，与沙箱无关
测试通过 `on('process.run', ...)` 拦截引擎 hook 接口，返回脚本化结果（`{ deny: ... }` / `{ value: ... }`），**从不启动真实进程**。例如"a git that cannot start is an answer, not a timeout"验证的是 hook deny 的传播，而非进程隔离。 claude-code:1016-1036 claude-code:192-209 

### 3. CI（`.github/workflows/mod-tests.yml`）——只跑 mod 测试和 typecheck
`claude plugin test mods/*/` + `tsc`，没有任何沙箱测试步骤。 claude-code:24-38 

## 各安全属性的验证证据对照

| 安全属性 | 本仓库验证证据 |
|---|---|
| 越界文件访问（symlink 落地、`..`、protected-path） | **无**——CHANGELOG 记录了修复（如 "protected-path bypass"），隐含上游有回归测试，但源码/测试不在此。 claude-code:2283-2283  |
| 禁止联网 | 仅 devcontainer 的 curl 自检（真流量）；命令级 socat 代理**无任何验证代码**。 claude-code:122-136  |
| 子进程继承（PID ns、cgroup） | **无**——`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`、`CLAUDE_CODE_TOOL_MEMORY_LIMIT` 只有 CHANGELOG 条目。 claude-code:4863-4863  |
| 资源超限 | **无** |
| 失败清理（孤儿进程树） | **无**——SIGTERM kill-tree 修复有记录无测试。 claude-code:2699-2699  |
| Seatbelt profile / bwrap argv 生成正确性 | **无**——连"只检查生成配置"的测试也没有。 |

**没有测试真正启动受限进程；也没有测试只检查生成的配置——这两类都不存在。**

## Notes

- 这是发布型仓库（CHANGELOG + 插件 + devcontainer），`BashTool`/沙箱实现及其测试在私有源码仓库。CHANGELOG 中大量 "Fixed … bypass" 条目是间接证据，表明上游确有针对这些边界的回归测试，但无法从本仓库确认其形态（integration vs config-check）。需要逐行验证请开 Devin session。
- 仓库中插件侧唯一的安全相关可执行代码是 `plugins/security-guidance/hooks/security_reminder_hook.py`（PostToolUse 审查 hook），它是检测工具而非边界验证。

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)

Wiki pages you might want to explore:
- [Diff Mod (anthropics/claude-code)](/wiki/anthropics/claude-code#4.2)
### Citations
**File:** mods/diff/tests/register.test.ts (L192-209)
```typescript
  test('two /diff typed together probe the repository once', async ($, on) => {
    const world = Fixtures.inRepository(on)

    await $.session.start(Fixtures.SESSION)

    const [first, second] = await Promise.all([
      $.command.run(Fixtures.DIFF),
      $.command.run(Fixtures.DIFF),
    ])

    const probes = world.runs.filter(run =>
      run.argv.includes('--show-toplevel'),
    )

    expect(first.text).toMatch(/^Diff panel (shown|hidden)$/)
    expect(second.text).toMatch(/^Diff panel (shown|hidden)$/)
    expect(probes, 'the second joined the probe in flight').toHaveLength(1)
  })
```
**File:** mods/diff/tests/register.test.ts (L1016-1036)
```typescript
  test('a git that cannot start is an answer, not a timeout', async ($, on) => {
    const runs: Args<'process.run'>[] = []

    Fixtures.startsSession(on)

    on('process.run', ($, e) => {
      runs.push(e)

      return e.argv.includes('--show-toplevel')
        ? { deny: Fixtures.FAILED_START }
        : { value: Fixtures.gitIn(e.argv, Fixtures.oneSecret()) }
    })

    await $.session.start(Fixtures.WORKTREE_SESSION)

    const { text } = await $.command.run(Fixtures.DIFF)
    const probes = runs.filter(run => run.argv.includes('--show-toplevel'))

    expect(text).toContain("isn't in a git repository")
    expect(probes, "this /diff's alone; no retry").toHaveLength(1)
  })
```
**File:** .github/workflows/mod-tests.yml (L24-38)
```yaml
      - name: Typecheck each mod's hooks and tests
        run: tsc -p mods/tsconfig.json

      - name: Run each mod's tests
        run: |
          if ! claude plugin test --help 2>/dev/null | grep -q '^Usage: claude plugin test'; then
            echo "claude $(claude --version) has no 'plugin test' yet; skipping the test step"
            exit 0
          fi
          status=0
          for mod in mods/*/; do
            [ -d "$mod/tests" ] || continue
            claude plugin test "$mod" || status=1
          done
          exit $status
```
**File:** CHANGELOG.md (L2283-2283)
```markdown
- Hardened the Linux filesystem sandbox against a protected-path bypass
```
**File:** CHANGELOG.md (L2699-2699)
```markdown
- Fixed SIGTERM during a running Bash tool orphaning the command's process tree in print/SDK mode; the CLI now aborts the turn, kills the tree, and exits 143
```
**File:** CHANGELOG.md (L4863-4863)
```markdown
- Added subprocess sandboxing with PID namespace isolation on Linux when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set, and `CLAUDE_CODE_SCRIPT_CAPS` env var to limit per-session script invocations
```
