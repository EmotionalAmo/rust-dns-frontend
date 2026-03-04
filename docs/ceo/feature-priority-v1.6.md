# Feature Priority Decision: v1.6.0

**Date:** 2026-03-04
**Decision by:** CEO (Bezos Framework)
**Status:** DECIDED

---

## Candidates

| # | Feature | Description |
|---|---------|-------------|
| A | Dashboard 性能指标扩展 | 响应时间分布直方图、P50/P95/P99 延迟统计 |
| B | 自定义规则管理 UI 改进 | 用户通过 UI 添加/编辑/删除屏蔽/允许域名规则 |

---

## Working Backwards Analysis

### "What won't change?" -- 用户永远需要什么？

用户选择 DNS 服务器，不变的需求是：
1. **控制权** -- 我能决定哪些域名被屏蔽、哪些被放行
2. **可靠性** -- 它在正常工作吗？速度够快吗？
3. **简单** -- 我不想写配置文件，给我一个按钮

### Feature A: Dashboard 性能指标

**客户是谁？** 技术型用户，想监控 DNS 解析性能。

**解决什么问题？** "我想知道 DNS 响应快不快。" 但诚实地说 -- 当前 rust-dns 延迟 1.3ms，性能不是用户的痛点。用户不会因为没有 P99 图而不用这个产品，也不会因为有了它而开始用。这是一个 "nice to have"，不是 "must have"。

**飞轮贡献：** 低。不直接影响用户获取或留存。

### Feature B: 自定义规则管理 UI

**客户是谁？** 所有用户 -- 每一个使用 DNS 过滤器的人。

**解决什么问题？** "我想屏蔽某个域名 / 放行被误杀的域名，但我不想去改配置文件。" 这是 AdGuard Home 和 Pi-hole 用户日常最高频的操作之一。没有这个功能，用户在 Dogfooding 中遇到误杀就得去改文件，摩擦力极大。

**飞轮贡献：** 高。规则管理 UI -> 用户能自定义过滤 -> 过滤体验提升 -> 用户更愿意推荐 -> 更多用户 -> 更多规则反馈 -> 更好的默认规则。

---

## Priority Decision (< 300 words)

**先做 Feature B: 自定义规则管理 UI。**

理由很简单，问一个问题就够了：**如果你让朋友试用 rust-dns，他第一个会问什么？**

不是 "P99 延迟多少"，而是 "这个域名被误杀了怎么办" 或 "我想屏蔽某个域名怎么弄"。

自定义规则管理是 DNS 过滤器的**核心用户操作路径**。AdGuard Home 和 Pi-hole 都把它放在最显眼的位置，因为这是用户感知 "控制权" 的关键界面。没有它，rust-dns 就不是一个完整的 DNS 过滤产品 -- 它只是一个 DNS 代理加上一堆只读图表。

Dashboard 性能指标是给已经信任产品的用户看的。但现在用户数是零，连 Dogfooding 都还在进行中。在用户连基本操作都没法通过 UI 完成的阶段，去打磨监控图表，就像餐厅还没有菜单就先装了一面电视墙播放厨房温度计。

这是一个**双向门决策**（可逆），但优先级判断是清晰的：先补齐核心功能缺口，再锦上添花。

---

## Decision

| Priority | Feature | Rationale |
|----------|---------|-----------|
| **P0 -- v1.6.0** | 自定义规则管理 UI | 核心用户操作，产品完整性必需 |
| P1 -- v1.7.0 | Dashboard 性能指标扩展 | 有价值但非紧急，等用户量起来后做 |

## Next Action

启动 Feature B 开发：按 `interaction-cooper -> ui-duarte -> fullstack-dhh -> qa-bach -> devops-hightower` 流程推进自定义规则管理 UI 的设计与实现。
