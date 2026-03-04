# rust-dns-frontend Release History

## v1.6.0 — 2026-03-04

**主题：Query Log 高级过滤**

### 变更内容

| 类型 | 描述 |
|------|------|
| feat | 时间范围按钮组 — 1h / 6h / 24h / 7d 快速切换 |
| feat | QTYPE 下拉过滤框 — 按 DNS 记录类型（A、AAAA、CNAME、MX 等）筛选 |
| feat | 域名搜索自动补全 — 根据已有日志实时提示候选域名 |

### Tag 信息

| 项目 | 值 |
|------|-----|
| Tag | `v1.6.0` (annotated) |
| Commit | `61b91f1` |
| Remote | `github.com:EmotionalAmo/rust-dns-frontend.git` |
| Push 状态 | 成功 |

### 对应 Backend 版本

`rust-dns-backend v1.6.0` — 新增 `qtype` 和 `time_range` 过滤参数到 query log API。

---

## v1.5.0 — 2026-03-04

**主题：上游分布图与系统状态增强**

### 变更内容

| 类型 | 描述 |
|------|------|
| feat | UpstreamDistributionChart 饼图直接显示百分比标签 |
| feat | System Status Card 新增活跃上游数指标 |

### Tag 信息

| 项目 | 值 |
|------|-----|
| Tag | `v1.5.0` (annotated) |
| Remote | `github.com:EmotionalAmo/rust-dns-frontend.git` |
