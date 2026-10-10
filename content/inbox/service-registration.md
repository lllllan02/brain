---
title: "服务注册（Service Registration）"
category: "服务治理"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["服务注册", "服务发现"]
aliases: ["Service Registration"]
---

**服务注册（Service Registration）是把服务实例的名称、IP、端口等信息登记到[[service-registry|服务注册中心]]或服务目录的过程，让其他服务能够据此定位它。** 登记可以由服务自身完成，也可以由代理或部署平台代为维护。

例如，订单服务启动后登记 `order-service → 192.168.1.10:8080`，调用方再通过[[service-discovery|服务发现]]取得实例地址。注册解决「把我在哪里记录下来」，发现解决「查到目标在哪里」。

[[distributed-coordination-service|分布式协调服务]]可以保存注册信息，[[consul|Consul]] 等产品提供服务目录和健康检查。登记存在不等于实例一定健康或可调用，调用方仍需处理超时和失败。
