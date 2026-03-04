# Changelog

All notable changes to rust-dns-frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.0] - 2026-03-04

### Added

- **时间范围按钮组** — Query Logs 页面新增快速时间范围选择按钮（1h / 6h / 24h / 7d），一键切换日志视图时间窗口。
- **QTYPE 下拉过滤框** — 新增 DNS 记录类型过滤下拉框，支持按 A、AAAA、CNAME、MX 等类型筛选查询日志。
- **域名搜索自动补全** — 域名搜索框新增自动补全功能，根据已有日志实时提示候选域名，提升搜索效率。

## [1.5.0] - 2026-03-04

### Added

- **UpstreamDistributionChart 百分比标签** — 上游分布饼图各扇区现在直接显示百分比数值标签，无需悬停即可读取各上游占比。
- **System Status Card 活跃上游数** — 系统状态卡片新增"活跃上游"指标，实时展示当前健康可用的上游 resolver 数量。

## [1.1.0] - 2026-03-03

### Added

- **DoT upstream address placeholder** — the upstream address input field now shows a DNS-over-TLS format hint to guide users when adding DoT upstreams.
- **ACLs — identity-based policies UI (Option A)** — full management interface for identity-based access control policies, including rule creation and ordering.
- **Monitoring & Alerts dashboard (Option C)** — new monitoring section with alert configuration, threshold management, and live status indicators.
- **nginx API proxy configuration** — bundled nginx config for proxying API requests in Docker Compose deployments, removing the need for manual reverse-proxy setup.
- **Cloudflare Pages deployment** — CI/CD workflow and `_redirects` / `_headers` configuration for deploying the frontend to Cloudflare Pages.
- **Dynamic clients display** — client groups page now shows dynamic clients alongside static ones, with MAC address badge rendering.
- **MAC address resolution** — enabled hardware address resolution in the client detail views.
- Insights page now excludes blocked domains from the top-queries chart for more meaningful traffic analysis.

### Fixed

- Dashboard refresh triggered from the correct location after the layout refactor.
- Query log layout aligned with the rest of the application.
- Client groups layout height corrected; "All" view now shows only static clients as intended.
- Frontend UI bugs in Audit Log view; Audit Log localization strings added.
- CI workflow `working-directory` and cache paths corrected for the monorepo structure.

### Changed

- **i18n migration** — all previously hard-coded Chinese strings have been moved into the i18n translation layer, making the UI fully localizable.
- Environment variables renamed from `ENT_DNS_*` to `RUST_DNS_*` across tests, docs, and runtime config.
- Project references and display names updated from "Ent-DNS" to "rust-dns" throughout the codebase.
- README, Dockerfile, and CI workflow optimized for clarity and build performance.

## [1.0.0] - 2026-03-03

### Added

- Initial release of rust-dns-frontend, split from the Ent-DNS monorepo.
- React + TypeScript SPA for managing the rust-dns-backend service.
- Dashboard with query statistics and cache metrics.
- DNS zone and record management UI.
- Upstream resolver management.
- Query log viewer with filtering.
- Client group management.
- Internationalization (i18n) foundation.
- Docker support with multi-stage build.

[Unreleased]: https://github.com/EmotionalAmo/rust-dns-frontend/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/EmotionalAmo/rust-dns-frontend/compare/v1.1.0...v1.5.0
[1.1.0]: https://github.com/EmotionalAmo/rust-dns-frontend/releases/tag/v1.1.0
[1.0.0]: https://github.com/EmotionalAmo/rust-dns-frontend/releases/tag/v1.0.0
