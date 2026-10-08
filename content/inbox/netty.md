---
title: "Netty"
category: "网络服务"
updated_at: "2026-10-08"
tags: ["Netty", "Java", "事件循环"]
aliases: ["Netty"]
---

**Netty 是一个异步、事件驱动的网络编程框架**（Java 生态里常用），用来快速开发高性能的协议服务端与客户端。它把连接抽象成 Channel，用 EventLoop 分发 I/O 事件，用 ChannelPipeline 串起解码、业务、编码等 Handler；底层连接通常建立在 I/O 多路复用之上。

它提供的是网络框架，**具体协议和业务可靠性仍由应用自己定义**。
