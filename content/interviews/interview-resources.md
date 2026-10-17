---
title: "Go 与 Agent 面试资料"
aliases: ["面经网站", "面试题库", "社招面试资料"]
category: "面试"
parent: interview-index
tags: ["面试", "Go", "Agent", "RAG"]
type: overview
learning_status: reading
created_at: "2026-10-18T00:54:04+08:00"
updated_at: "2026-10-18T00:59:41+08:00"
learning_status_changed_at: "2026-10-18T01:02:36.557+08:00"
---

面向 **Go 后端 + AI / Agent 应用开发社招**的资料目录。优先用按主题整理的网站与仓库建立题目储备，再用个人面经补充具体场景、追问和求职经验，避免依靠大量零散帖子拼出准备范围。

首批收录 **14 套专题题库或学习手册、6 篇个人分享**，核对日期为 2026-10-18。本页保存出处、覆盖范围与选用建议，归并后的问题列在[[interview-index|社招面试题目录]]，尚未展开答案。标为「优先」表示与当前方向更贴近，不表示答案已全面校验。

## Go 与后端基础

| 资料与维护者 | 形式与覆盖 | 选用建议与限制 |
| --- | --- | --- |
| [Go 程序员面试笔试宝典](https://golang.design/go-questions/) · 饶全成、欧长坤、楚秦等 | 中文问题解析；切片、map、接口、channel、context、调度、GC | **优先：Go 原理题主参考。** 已核对目录；网站仅含纸质书部分内容、更新和勘误，源码细节需按 Go 版本复核 |
| [interview-go](https://github.com/lifei6671/interview-go) · lifei6671／社区 | 中文题目集合；Go 语法与并发题、MySQL、Redis、算法、架构场景 | **优先：Go 后端题目储备。** 已核对可检索 README 中的题目目录，含解析入口；不是单次面试实录，未逐题校验 |
| [小林 coding](https://xiaolincoding.com/) · 小林 | 中文图解专题；网络、操作系统、MySQL、Redis，另有面经入口 | **优先：后端公共基础。** 已核对主页专题；使用公开图解内容，站内训练营与付费服务未评估 |
| [GoExpertProgramming](https://github.com/RainbowMango/GoExpertProgramming) · RainbowMango | 《Go 专家编程》配套仓库；数据结构、标准库、工具链与编程陷阱 | 补充原理解释，属于学习手册。README 明确说明下架了部分章节，不能当作完整在线书籍或完整题库 |

## AI 应用、RAG 与 Agent 专题

| 资料与维护者 | 形式与覆盖 | 选用建议与限制 |
| --- | --- | --- |
| [Agent-Interview-100](https://github.com/BigKunLun/Agent-Interview-100) · BigKunLun | 中文分主题问答；架构、RAG、工具、多 Agent、记忆、评估、安全与部署 | **优先：中文 Agent 题目骨架。** 已读目录与 Agent Loop 样篇，组织为简答、解析、追问和参考资料；题目与代码未全面核验 |
| [AI Engineer Interview Questions](https://github.com/ombharatiya/AI-Engineer-Interview-Questions) · ombharatiya | 英文专题题库；LLM、上下文、RAG、Agent、评测、生产与安全 | **优先：AI 工程查漏。** 已读 README 和部分 Agent 题目；公司题单基于公开资料编排，不能当作逐轮真实面试记录 |
| [AgentGuide](https://github.com/adongwanai/AgentGuide) · adongwanai | 中文学习路线、教程、项目与面试题入口；区分开发岗和算法岗 | 扩展储备，优先开发岗路线与 RAG／Agent 分支。已核对 README 与 RAG 题目页；部分材料是问题清单，未逐项确认是否配有完整答案 |
| [LLM & Agent 面试题全集](https://github.com/dirjaker/llm_agent_interview) · dirjaker | 中文专题集合；Prompt、RAG、Agent、评估、安全、工程化、生产场景及速查入口 | 扩展工程场景储备。已核对 README 与文档结构；Python／FastAPI 部分需迁移到自己的 Go 项目语境，题量与「高频」为作者自述 |
| [AIGuide](https://github.com/lgd8981289/AIGuide) · lgd8981289 | 中文分类题库；RAG、Agent、AI 应用工程、项目与系统设计，另含前端和多语言专题 | 扩展 RAG、Agent 与后端交叉问题。已核对仓库中的分类与逐题目录；一次在线正文读取失败，可先用仓库目录，答案未审校 |
| [Agent 面试专题](https://heychris.cn/llm-interview/) · 不吃辣的 Chris | 中文按优先级编排的 Agent 题目导航；工具、MCP、记忆、框架、工程指标等 | 扩展口述题储备。已读总览；**独立 RAG 栏目当前无题目**，部分相关题在 Agent 栏；一次题目子页读取失败，未核对全部答案 |

选 AI 资料时，先查工具执行、上下文／记忆、RAG、评测和生产故障，再按目标岗位补模型基础。框架 API、模型特性和协议版本需要在实际使用时核对官方资料；本目录不把各仓库声称的题量、出题公司或频率作为已验证事实。

## 系统设计、算法与准备方法

| 资料与维护者 | 形式与覆盖 | 适用方式 |
| --- | --- | --- |
| [System Design Primer](https://github.com/donnemartin/system-design-primer) · Donne Martin／社区 | 英文系统设计指南与示例解答，提供中文入口；短链、信息流、爬虫等 | 练需求约束、整体设计、核心组件和瓶颈取舍。已核对 README 的准备方法与练习目录，未逐项验证方案 |
| [CS-Notes](https://github.com/CyC2018/CS-Notes) · CyC2018／社区 | 中文分主题笔记与题解；算法、操作系统、网络、数据库、系统设计 | 补公共基础覆盖。已核对 README 分类；Java 专属章节按需跳过，旧实现与旧版本结论须复核 |
| [Hello 算法](https://www.hello-algo.com/) · krahets／社区 | 中文算法教材，提供 Go 等多语言代码 | 补复杂度、数据结构与算法理解，属于教材，不是公司真题库。已核对首页与 Go 代码支持说明，未运行示例 |
| [Tech Interview Handbook](https://www.techinterviewhandbook.org/coding-interview-prep/) · Yangshun Tay | 英文编码面试方法；主题练习、沟通、复杂度、编码与测试 | 已读编码准备页。可练答题过程；海外招聘流程、时间估计和商业资源推荐不直接套用国内 Go 社招 |

## 个人面经补充

个人记录用来观察实际提问与回答缺口。以下已读帖子主体，未独立核验候选人身份、录用结果或公司风格；其中的复盘参考答案不等于当场回答。

| 原文与作者 | 时间／背景 | 值得补充的问题 |
| --- | --- | --- |
| [社招五年 Go 面经](https://www.nowcoder.com/discuss/882048490270904320) · 一切顺利鸭哈哈 | 页面显示 05-07，年份未核实；自述五年 Go 社招 | 与当前方向最贴近：Go 并发、后端架构与 Agent 通信、记忆、沙箱、MCP、效果评估交叉出现 |
| [Agent 应用社招失败复盘](https://www.nowcoder.com/discuss/926232883432296448) · 讨个offer咯 | 页面显示 09-06，年份未核实；AI 全栈／Agent 应用社招 | 通信告警项目中的日志处理、知识库污染、审核成本与长期信息提取 |
| [Agent 春招题单与复盘](https://www.nowcoder.com/discuss/917353328109944832) · Musennnn | 页面显示 08-13，年份未核实；此帖未明确招聘类型及工作年限 | 按模块归纳经历；工具循环、异常分层、记忆写入与任务成功率，不能作为社招频率统计 |
| [滴滴社招：Java 转 Go](https://www.cnblogs.com/charler/p/19075249) · charler。 | 2025-09-05；社招一面 | 支付防重、Redis 不可用、分库分表、规则配置；作者反思项目解释深度不足 |
| [两个月后端面试经历](https://www.v2ex.com/t/1060319) · main1234 | 2024-07-26；自述五年以上 Go 后端经验 | 算法准备与项目准备的区别，稳定性、服务治理与线上故障叙述 |
| [一次 Go 面试失败经历](https://www.v2ex.com/t/1074459) · sagaxu | 2024-09-20；工作年限未说明 | 并发模型、interface 等语言基础；项目架构准备与面试预期不匹配 |

这批资料可以建立准备范围，尚不足以证明目标岗位已全面覆盖。后续补充以现有题库的缺口、目标 JD 和个人项目为依据；优先增加新的问题或追问，多个网站重复同一题不算新增覆盖。
