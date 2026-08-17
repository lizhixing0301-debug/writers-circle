# Writers Circle（三十二人文学志后台）

这是 Writers Circle 的 Phase 0 项目骨架。当前只包含 Next.js、Payload CMS 与 PostgreSQL 的基础集成。

本阶段没有成员档案、投稿、新闻搜索、AI、微信公众号或其他业务功能。

## 本地地址

- 首页：<http://localhost:3000>
- Payload 后台：<http://localhost:3000/admin>
- 首次创建管理员：<http://localhost:3000/admin/create-first-user>

项目不会预设管理员邮箱或密码。第一次使用后台时，请在 Payload 页面自行创建管理员。

## 环境要求

- Node.js 20.9.0 或更高版本
- pnpm 11
- PostgreSQL（当前 Mac 已安装 Postgres.app 2.9.6，内含 PostgreSQL 18.6）

真实数据库连接信息和 Payload Secret 只保存在被 Git 忽略的 `.env` 中。仓库里的 `.env.example` 只有无效示例值。

## 第一次设置

安装项目依赖并生成本地环境文件：

```bash
pnpm install
pnpm setup:env
```

当前项目使用专用的本地 PostgreSQL 数据目录 `.postgres/data`。如果该目录不存在，可以执行：

```bash
mkdir -p .postgres
/Applications/Postgres.app/Contents/Versions/latest/bin/initdb \
  -D .postgres/data \
  --auth=trust \
  --username="$USER" \
  --encoding=UTF8 \
  --locale=C
```

这个数据库只用于本机开发，并且只监听本机地址。

## 启动

先启动 PostgreSQL：

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl \
  -D .postgres/data \
  -l .postgres/postgres.log \
  -o "-h 127.0.0.1 -p 5432" \
  start
```

首次启动数据库后，创建项目数据库：

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/createdb \
  -h 127.0.0.1 \
  -p 5432 \
  -U "$USER" \
  writers_circle
```

再启动 Writers Circle：

```bash
pnpm dev
```

## 检查命令

```bash
pnpm test --run
pnpm lint
pnpm generate:types
pnpm build
```

## 停止 PostgreSQL

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl \
  -D .postgres/data \
  stop
```

## 未来 Docker Compose

应用只通过 `DATABASE_URI` 连接数据库，Payload 加密密钥只通过 `PAYLOAD_SECRET` 读取。未来加入 Docker Compose 时可以沿用这两个环境变量，无需重写应用结构。Phase 0 不包含 Docker Compose 文件或容器部署。
