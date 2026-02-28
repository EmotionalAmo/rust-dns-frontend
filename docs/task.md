# Task #7: 修复规则页面状态显示和编辑问题 (完成)

## 问题
1. 无法分辨规则是启用还是禁用状态
2. 无法修改已添加的规则
3. 应该有一列专门显示规则状态（启用/禁用）

## 解决方案

### 后端修改

#### `src/api/handlers/rules.rs`
- 添加 `UpdateRuleRequest` 结构体，支持更新 rule、comment 和 is_enabled
- 添加 `ToggleRuleRequest` 结构体，用于切换状态
- 实现 `update()` 函数：PUT /api/v1/rules/{id}
  - 获取现有规则并验证
  - 禁止编辑订阅列表规则（created_by LIKE 'filter:%'）
  - 支持部分更新（rule、comment、is_enabled 可选）
  - 状态变化时自动重新加载过滤器
- 实现 `toggle()` 函数：POST /api/v1/rules/{id}
  - 快速切换规则启用/禁用状态
  - 自动重新加载过滤器

#### `src/api/router.rs`
- 更新 `/api/v1/rules/{id}` 路由，添加 PUT 和 POST 方法
  - PUT: `handlers::rules::update`
  - POST: `handlers::rules::toggle`

### 前端修改

#### `src/api/rules.ts`
- 添加 `UpdateRuleRequest` 和 `ToggleRuleRequest` 接口
- 添加 `updateRule(id, request)` 方法
- 添加 `toggleRule(id, request)` 方法

#### `src/pages/Rules.tsx`
- 添加状态列（colStatus）到表头
- 创建 `EditRuleDialogContent` 和 `EditRuleDialog` 组件
  - 支持编辑规则内容、备注和启用状态
  - 使用 Checkbox 显示/切换启用状态
- 在表格行中添加状态 Badge
  - 启用：绿色 + CheckCircle2 图标 + "已启用"
  - 禁用：灰色 + XCircle 图标 + "已禁用"
  - 点击 Badge 可快速切换状态
- 添加编辑按钮（RefreshCw 图标）到操作列
- 实现 `handleToggleRule()` 函数处理单个规则状态切换
- 实现 `handleEditRule()` 函数打开编辑对话框

#### `src/locales/zh-CN.json`
- 添加翻译：
  - `rules.colStatus`: "状态"
  - `rules.statusEnabled`: "已启用"
  - `rules.statusDisabled`: "已禁用"
  - `rules.enabled`: "规则已启用"
  - `rules.disabled`: "规则已禁用"
  - `rules.editDialogTitle`: "编辑规则"
  - `rules.editDialogDesc`: "修改规则内容、备注或启用状态"
  - `rules.enableRule`: "启用此规则"
  - `rules.updateSuccess`: "规则更新成功"
  - `rules.updateError`: "更新失败: {{msg}}"
  - `rules.toggleError`: "切换失败: {{msg}}"

## 测试
- ESLint: 无警告
- TypeScript: 编译通过
- 单元测试: 7 个测试全部通过

## 视觉效果
- 状态列使用彩色 Badge 区分启用/禁用
- 启用状态：绿色边框和文字，浅绿色背景
- 禁用状态：灰色边框和文字，浅灰色背景
- 点击 Badge 可快速切换状态
- 编辑按钮位于删除按钮左侧，使用刷新图标表示编辑

## 安全性
- 禁止编辑从订阅列表导入的规则（created_by LIKE 'filter:%'）
- 更新规则后自动重新加载过滤器确保生效

## 提交
- Commit: bd4c498
- 文件: 5 个文件修改，390 行新增，13 行删除
