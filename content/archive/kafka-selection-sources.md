---
title: "Kafka 与同类消息队列选型导读"
category: "Kafka"
parent: kafka-use-cases
type: "article"
tags: ["Kafka", "消息队列"]
created_at: "2026-10-12T20:49:46+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://kafka.apache.org/43/design/design/"
  - "https://kafka.apache.org/43/apis/"
  - "https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaShareConsumer.html"
  - "https://www.rabbitmq.com/docs/exchanges"
  - "https://www.rabbitmq.com/docs/confirms"
  - "https://www.rabbitmq.com/docs/streams"
  - "https://rocketmq.apache.org/docs/featureBehavior/02delaymessage/"
  - "https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/"
---

**「这些官方资料解释同类消息队列在日志复用、投递控制与业务消息协议上的差异。」** Kafka 按 4.3 文档，RabbitMQ 按本次页面标注的 4.3，RocketMQ 按 5.0 文档阅读。产品机制来自原文；优先评估哪种产品是根据机制作出的判断，本篇没有性能实测。

## Kafka：日志如何支撑持续复用

[Design](https://kafka.apache.org/43/design/design/)把分区中的消费进度表示为位置，进度与日志保留分开：**「消费过不等于立刻删除」**，消费者可以回到仍保留的位置。顺序追加、批量传输与压缩共同服务于吞吐，但批量等待也影响延迟，不能据此给不同产品排固定名次。

[API](https://kafka.apache.org/43/apis/)进一步区分职责：Connect 用连接器持续导入、导出数据；Streams 在应用中把输入 Topic 转换为输出 Topic。这为“采集 → 多方处理 → 重新计算”提供配套工具。实际收益取决于所需连接器、客户端和处理方式是否匹配，并非 Broker 自动计算。

常规消费组按分区分工，顺序与并行度因此相互约束。[KafkaShareConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaShareConsumer.html)则允许组内多个消费者处理同一分区的记录，以牺牲记录顺序换取更灵活的分担；部署时要核对 Broker 与客户端支持。因此“Kafka 只能按分区分派工作”不能作为不带版本和模式的结论。

## RabbitMQ：路由与投递控制，以及 Streams 的另一种模型

[Exchanges](https://www.rabbitmq.com/docs/exchanges)说明消息先进入 Exchange，再依 Binding 路由：Direct 按键精确匹配，Topic 按模式匹配，Fanout 发往所有绑定目标。业务可以用这些规则表达任务分流，而不是让每个消费者读取后自行筛选。

[Consumer Acknowledgements](https://www.rabbitmq.com/docs/confirms)把消息处理结果与投递衔接：手动确认表示这次投递已处理；拒绝可选择重新入队，也可按配置进入死信目标。Prefetch 限制未确认投递量，避免消费者一次接下过多工作。反复立即入队可能形成重投循环，因此有确认机制不等于已经设计好重试策略。

[Streams](https://www.rabbitmq.com/docs/streams)补充另一种消费模型：普通队列完成确认后会移除消息，Stream 则保留追加日志，允许按位置重新读取；Super Stream 还能分区扩展。官方把 Streams 定位为队列的补充，两者功能并不完全相同。若需求重心是历史复用，应把 RabbitMQ Streams 纳入比较，不能拿普通队列的限制代表整个产品。

## RocketMQ：定时与本地事务怎样进入消息流程

[Delay Message](https://rocketmq.apache.org/docs/featureBehavior/02delaymessage/)以未付款订单到期检查为例：生产者设定投递时间，消息到期后才可被消费者获取。它提供时间触发能力，省去应用自行维护整套调度流程；投递时间不等于业务完成时间，消费者仍要检查订单当前状态，并核对部署版本的时间范围和精度限制。

[Transaction Message](https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/)采用暂不可见的半消息、本地事务执行结果和状态回查衔接发布：本地事务成功则提交消息，失败则回滚，结果不明时向生产者回查。这减少了本地业务成功而事件未发布的协调工作，但应用必须提供可靠的事务状态判断。

原文明确，这种机制只保证最终一致性的相关环节，**「不保证消费者业务结果与上游事务一起原子提交」**；消费侧仍需失败恢复与幂等。它也不同于 Kafka 将 Topic 写入和消费位置纳入事务的边界，不能只比较双方“有没有事务”。同页还说明已消费消息不会立即物理删除，保留期内可以重新消费，因此重放也不是 Kafka 独有。
