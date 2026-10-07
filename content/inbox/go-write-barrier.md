---
title: "Go 写屏障为什么要关注旧指针和新指针？"
category: "Go"
created_at: "2026-01-18"
updated_at: "2026-10-07"
tags: ["Go", "GC", "写屏障"]
---

并发标记期间，业务代码可能把对象的唯一引用从尚未扫描的位置移到已经扫描的位置，导致 GC 漏掉仍在使用的对象。写屏障在修改相关指针时补充标记工作，保护可达性判断。

Go 的混合写屏障结合删除屏障与插入屏障。删除屏障关注被覆盖的旧指针，防止对象从堆上断开后只剩栈内引用；插入屏障关注新指针，防止未扫描栈里的对象被移到已经扫描的堆对象下。

运行时源码给出的概念模型如下，`shade` 表示发现并标记对象、加入必要的扫描工作；这不是可直接调用的 Go API：

```text
writePointer(slot, ptr):
    shade(*slot)
    if current stack is grey:
        shade(ptr)
    *slot = ptr
```

实际实现可能采用更保守的处理来减少检查成本。不能把这一抽象模型当作每次赋值都原样执行的代码；编译器也可以消除不必要的屏障，普通栈内写入通常不需要同样的屏障，全局指针写入则需要考虑。

混合屏障使已扫描栈不必依靠标记末尾的全量重新扫描来兜底，但 [[go-gc-cycle|GC 阶段切换]] 仍有暂停。写屏障也不是业务并发同步原语，无法修复数据竞争。

机制与证明见 [runtime/mbarrier.go](https://go.dev/src/runtime/mbarrier.go) 和 [消除栈重扫描的设计](https://github.com/golang/proposal/blob/master/design/17503-eliminate-rescan.md)。
