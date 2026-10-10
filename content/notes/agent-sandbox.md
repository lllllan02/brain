---
title: "Agent 沙箱（Sandbox）"
category: "Agent"
tags: ["Agent", "沙箱"]
aliases: ["Sandbox", "沙箱"]
created_at: "2026-10-09"
updated_at: "2026-10-10"
---

**沙箱（Sandbox）是限制程序访问范围和资源用量的执行环境。** 让 Agent 修改项目、运行测试时，需要给它完成任务的能力，同时限制误操作和不可信代码的影响。

## 需要解决什么，怎么解决

1. **别动到无关文件。** 用[[sandbox-filesystem|文件边界]]只暴露必要目录，区分只读输入和可写输出。
2. **能读不代表能外传。** 用[[sandbox-network|网络边界]]关闭外网或限制出口；调用 API 时，用[[sandbox-credentials|凭据代理]]完成认证，真实密钥留在沙箱外。
3. **权限有限，资源仍可能耗尽。** 设置[[sandbox-resources|资源限额与超时]]，多任务再加[[sandbox-concurrency|整体并发控制]]。
4. **命令结束，残留未必消失。** 通过[[sandbox-lifecycle|生命周期]]决定环境共享、复用与回收，让[[sandbox-processes|子进程]]一起受限、一起清理。
5. **规则要落到执行上。** [[sandbox-execution|权限检查与沙箱执行]]分别决定是否允许操作、获准后能做什么；各工具是否进入同一边界需单独确认。
6. **配置存在不等于有效。** 用[[sandbox-verification|成功与拒绝的对照测试]]验证限制；沙箱内的合法修改仍需业务测试与审查。

## 实现与选型

**先看程序向谁请求系统能力，再看工具怎样组织环境。** 按这个思路，可以把方案归纳为：

| 方式 | 原理与代表方案 |
| --- | --- |
| 给本机程序加限制 | [[srt-sandbox-practice\|SRT]]、[[bubblewrap-sandbox-practice\|bubblewrap]]借助系统能力限制程序可见、可访问的资源，仍使用宿主内核。SRT 在 Linux 上使用 bubblewrap，在 macOS 上使用 Seatbelt。 |
| 把执行环境组织成容器 | [[docker-sandbox-practice\|普通 Docker 容器]]也依靠系统隔离能力、共享所在 Linux 主机的内核，同时提供镜像打包、挂载和容器管理。它与上一类主要是环境组织方式不同。 |
| 加一个「替身内核」 | [[gvisor-sandbox-practice\|gVisor]]自己处理程序的许多系统调用，再受限地使用宿主能力；通过 `runsc` 接入 Docker，改变的是容器内部的隔离机制，不只是多包一层启动命令。 |
| 给任务独立的客户内核 | [[firecracker-sandbox-practice\|Firecracker]]创建 microVM，程序先访问虚拟机里的内核，再由虚拟化层提供底层资源。 |

## 怎样权衡方案

选型要同时看三件事：**隔离边界能否覆盖风险、运行环境能否满足程序、维护成本能否承担。** 共享宿主内核的方案接近原生环境；gVisor 减少直接接触宿主内核的机会，但增加兼容性与性能取舍；microVM 提供独立客户内核，也增加系统镜像与生命周期管理。

隔离机制之外，还要比较依赖能否复现、接口能否接入、数据能否离开本机。集成产品或远程服务可以减少自行搭建，却会引入产品约束或平台依赖。各方案的收益、代价与选择条件见[[sandbox-implementations|方案对比与用法]]，组合案例见[[sandbox-projects|实际项目]]。

进一步看实现时，[[codex-sandbox-overview|Codex 源码]]展示权限策略如何进入执行器，[[claude-sandbox-overview|Claude Code 公开运行时]]展示命令包装与网络代理如何配合。
