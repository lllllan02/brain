---
title: "TLB（快表）"
category: "操作系统"
updated_at: "2026-10-07"
tags: ["TLB", "地址转换", "缓存"]
aliases: ["快表", "Translation Lookaside Buffer"]
---

**TLB 是缓存虚拟地址到物理地址转换结果及相关权限的硬件缓存**，让多数访问不必每次都查 [[paging|页表]]。

未命中只说明缓存里没有这次转换，系统仍可继续查页表取得映射；只有映射状态本身要求处理时才涉及 [[page-faults|缺页]] 或访问异常，所以普通 miss 可完全在内存中解决，而真正的缺页也可能只分配零页或写时复制（copy-on-write）、不一定 I/O。由硬件遍历还是软件处理取决于体系结构，不能按 CISC、RISC 二分；进程切换时同一虚拟页号可能属于不同地址空间，ASID、PCID 等标记能让转换共存，但映射或权限改变后仍须失效旧条目，多核上还可能 TLB shootdown。

提高局部性、减少活跃页面或按条件用大页都能降低转换压力，是否有效要看工作集；TLB 命中率低、数据缓存命中率低与真实缺页是三个不同的排查方向。来源：[OSTEP 第 19 章](https://pages.cs.wisc.edu/~remzi/OSTEP/Chinese/19.pdf)。
