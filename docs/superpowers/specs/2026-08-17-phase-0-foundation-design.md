# Writers Circle Phase 0 基础骨架设计

## 目标

建立一个最小、可本地运行且便于非程序员长期维护的 Writers Circle 项目骨架。项目只验证 Next.js 首页、Payload CMS 后台和 PostgreSQL 数据库能够协同工作，不实现任何文学志业务功能。

## 范围

本阶段包含：

- 初始化 Git 仓库并配置适合 Node.js、Next.js、Payload CMS 和本地环境变量的 `.gitignore`。
- 使用 TypeScript 创建单体 Next.js 应用。
- 在同一应用中集成 Payload CMS，后台路径为 `/admin`，API 路径为 `/api`。
- 使用 Payload 官方 PostgreSQL 适配器连接 PostgreSQL。
- 仅保留 Payload 后台登录所需的 `users` 集合。
- 创建可访问的最小首页，明确显示 Writers Circle 项目名称和 Phase 0 状态。
- 提供 `.env.example`，只包含占位值和说明；真实密码、密钥和 Secret 仅保存在不提交的 `.env`。
- 提供基础自动化测试、代码检查和生产构建验证。
- 在本地启动应用，实际检查首页与后台响应。
- 采用清晰的环境变量与单应用结构，为未来 Docker Compose 提供接入基础，但本阶段不实现完整容器部署。

本阶段不包含：成员档案、投稿、新闻搜索、AI、微信公众号、正式内容模型、权限体系扩展、生产部署、完整 Docker Compose、视觉设计系统或任何 Phase 1 功能。

## 技术架构

采用一个仓库、一个 Next.js 应用、一个 Payload 配置的单体结构。Next.js App Router 同时承载公开首页和 Payload 提供的后台/API 路由，避免拆分前后端项目带来的重复配置和维护成本。

主要路径：

- `/`：公开首页。
- `/admin`：Payload CMS 管理后台。
- `/api`：Payload CMS API。
- `src/payload.config.ts`：Payload、PostgreSQL 适配器和集合注册的唯一配置入口。
- `src/collections/Users.ts`：后台登录用户集合。

数据库连接通过 `DATABASE_URI` 环境变量传入。Payload 加密密钥通过 `PAYLOAD_SECRET` 环境变量传入。代码不得包含真实连接密码或固定 Secret。

## 运行方式

使用项目锁定的 pnpm 作为包管理器。开发者只需配置 `.env`、保证 PostgreSQL 可连接，然后运行一个开发命令即可同时访问首页与后台。

如果当前机器没有可用的 PostgreSQL 服务或 Docker，本阶段仍会完成代码、自动化测试和生产构建验证，但不得把无法实际连接数据库的后台描述为“已正常打开”。最终交付必须区分已验证项目与受本机环境限制未验证项目。

## 测试与验收

自动化测试至少验证首页的核心标识内容。静态检查验证 TypeScript/ESLint 配置，生产构建验证 Next.js 与 Payload 能完整编译。

运行时验收必须使用真实 HTTP 请求检查：

- 首页 `/` 返回成功状态且包含 Writers Circle 标识。
- 后台 `/admin` 返回成功状态或正常的首次管理员创建页面。
- 应用日志没有阻止运行的错误。

若 PostgreSQL 可用，还需确认 Payload 能完成数据库连接与必要的初始迁移/表结构创建。不得为了通过检查改用 SQLite 或其他数据库。

## 错误处理与安全

- 缺少 `DATABASE_URI` 或 `PAYLOAD_SECRET` 时，应尽早给出明确配置错误。
- `.env`、数据库数据目录、构建产物、依赖目录和日志不得提交 Git。
- `.env.example` 中只能放无效示例值，不放真实密码、API Key 或 Secret。
- 不自动创建默认管理员账号或硬编码登录凭据；首次访问后台时由用户通过 Payload 页面创建管理员。

## 完成条件

Phase 0 只有在以下项目均有证据时才算完成：Git 已初始化；主要基础文件已创建；依赖已安装；测试、代码检查和生产构建已运行；开发服务已启动；首页已通过 HTTP 检查；Payload 后台已通过实际访问检查，或被明确标记为受 PostgreSQL/Docker 缺失影响而未完成运行验证。完成后停止，不进入 Phase 1。
