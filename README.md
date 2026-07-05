# vben-admin-monorepo（本仓库：ben）

一套基于 Vue 3 + TypeScript 的多包单体（monorepo）管理的后台前端模板与组件集合，包含多个 UI 变体（例如 Element Plus 版本的 web-ele 应用）、共享包（stores、styles、utils 等）以及内部工具配置，适合搭建可扩展的管理后台或作为企业项目模板使用。

---

## 主要特性
- 多包（pnpm workspace + Turbo）monorepo 架构，便于模块化开发与复用
- Vue 3 + TypeScript + Vite 快速开发体验
- 多种 UI 变体（Element Plus、Naive、TDesign 等）通过独立 app 管理
- 共享 package（@vben/*）：stores、styles、utils、icons、locales、preferences 等
- 内部统一配置：ESLint、Stylelint、Tailwind、Vite、tsconfig 等集中管理
- 包含 Supabase 认证实现文档（docs/supabase-auth-implementation.md）

---

## 技术栈
- 语言：Vue (SFC) + TypeScript（主要），少量 CSS/SCSS/HTML
- 构建/运行：Vite、pnpm、Turbo
- 状态管理：Pinia
- UI：Element Plus（apps/web-ele）、其它变体依赖包存在于 monorepo
- 其他：@vueuse/core、dayjs、lucide-vue-next、supabase 客户端等

---

## 仓库结构（重要顶层项）
```
apps/                   多个可运行的前端应用
  web-ele/              Element Plus 版本的前端应用（主要示例）
    src/                应用源码（app.vue、main.ts、router、store、views 等）
    public/             公共静态资源
    .env*               环境变量示例（.env.development, .env.production）
packages/               内部共享包（workspace）
  @core/                核心功能（项目内包）
  constants/            常量
  effects/              特效/副作用相关模块
  icons/                图标集合
  locales/              多语言资源
  preferences/          偏好/配置处理
  stores/               Pinia store 集合
  styles/               全局样式 / 设计 token
  types/                TypeScript 类型定义
  utils/                公共工具函数
internal/               内部配置/工具（lint-config、vite-config、tsconfig 等）
docs/                   文档（如 Supabase 认证实现）
package.json            根级脚本与依赖（monorepo 管理脚本）
pnpm-workspace.yaml     pnpm workspace 定义
turbo.json              Turbo 配置（任务并行/缓存）
```

**如何协同工作（运行时概览）**  
这是一个前端 monorepo：共享包（packages/*）以 workspace 方式在各个 app 中被引用；各 app（apps/*）是独立的 Vite 应用，运行时通过 Vite 启动，状态由 Pinia 管理；构建使用 pnpm + turbo 对包/应用做并行化构建与缓存。内部目录 internal/ 提供统一的工具与配置，减少各应用的重复配置。

---

## 快速开始（从克隆到运行）
先决条件：
- Node.js：^22.18.0 或 ^24.0.0（package.json 指定）
- pnpm：>=11.0.0（workspace & scripts 使用 pnpm）
- 推荐：Git、可访问注册表（若使用私有 registry，请事先配置）

常用命令（在仓库根目录）：
```bash
# 安装依赖（根仓库）
pnpm install

# 或者使用内置脚本（等价）
pnpm run bootstrap

# 启动开发环境（运行整个 monorepo 的 dev 流程）
pnpm run dev

# 单独启动 Element Plus 版本的应用（apps/web-ele）
pnpm run dev:ele
# 或者等价（针对特定包/应用）
pnpm -F @vben/web-ele run dev

# 本地预览（生产构建后的预览）
pnpm run preview

# 构建（根级，会触发 turbo 构建）
pnpm run build
# 构建特定 app（如 web-ele）
pnpm run build:ele
# 亦可使用 filter：
pnpm run build --filter=@vben/web-ele

# 类型检查
pnpm -F @vben/web-ele run typecheck
# 或根级 typecheck（由 turbo 负责分发）
pnpm run check:type

# 单元测试（vitest）
pnpm run test:unit
```

环境文件：
- apps/web-ele 下有 `.env.development`, `.env.production`, `.env.analyze` 等示例。根据需要复制并设置实际值：
```bash
cp apps/web-ele/.env.development apps/web-ele/.env
# 编辑 apps/web-ele/.env，设置必要的 API_KEY / 后端地址等
```
（注意：仓库中可能使用 Supabase 或其他第三方服务，具体环境变量请参阅 apps/web-ele 下的 .env 示例内容 或 docs/ 中的说明。）

---

## 开发说明
- monorepo 管理：pnpm workspace + turbo（turbo.json）用于任务并行、缓存和部署加速。
- 共享包：packages/* 提供按功能划分的模块，应用通过 workspace 引用本地版本，开发时可即时联调。
- 代码风格 & 钩子：仓库包含 ESLint、Stylelint、oxfmt/oxlint、lefthook 等配置（根目录与 internal/ 下的配置）。
- 内部工具：internal/ 包含 node-utils、vite-config、tailwind-config 等，便于多应用共享同一套配置。

---

## 文档 & 参考
- Supabase 认证实现（仓库内文档）：`docs/supabase-auth-implementation.md`
- 根 README（该文件）和区域 README（若存在）包含更多各应用/包的使用细节
- package.json: 根级脚本与依赖配置（node 引擎、pnpm 版本、常用 script）

---

## 常见问题（FAQ）
Q: 我应该先安装依赖还是先构建 packages？
A: 先运行 `pnpm install`（或 `pnpm run bootstrap`），pnpm 会在 workspace 内联安装各包依赖；之后可以运行 `pnpm run dev` 或单独启动某个 app。

Q: 如何在本地调试共享包的改动？
A: 修改 packages/* 内代码后，直接在 app 的 dev 模式下保存，Vite + workspace 会生效；也可以运行根级 `pnpm run dev`（turborepo 会管理任务）。

---

## 贡献
欢迎提交 issue 与 PR。仓库采用 MIT 许可证。开发者指南/协作流程请参阅仓库内的贡献说明（如果需要，我可以基于现有结构帮你补充 CONTRIBUTING.md）。

---

## 许可证
本项目遵循 MIT 许可证。详见仓库根目录的 `LICENSE` 文件。
