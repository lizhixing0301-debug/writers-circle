# Writers Circle（三十二人文学志后台）

这是 Writers Circle（三十二人文学志后台）的本地开发项目，使用 Next.js、Payload CMS 与 PostgreSQL。

当前已包含成员档案后台和 Phase 2 投稿系统。新闻搜索、AI、微信公众号接口、自动发布和公开成员展示尚未开发。

## 本地地址

- 首页：<http://localhost:3000>
- 投稿页：<http://localhost:3000/submit>
- Payload 后台：<http://localhost:3000/admin>
- 首次创建管理员：<http://localhost:3000/admin/create-first-user>

项目不会预设管理员邮箱或密码。第一次使用后台时，请在 Payload 页面自行创建管理员。

## 成员档案

登录 Payload 后台后，可以在“内容管理”中看到：

- “成员档案”：录入姓名、笔名、文学资料、作品、搜索关键词和授权情况。
- “图片资源”：上传成员头像，并填写方便读屏软件理解的图片说明。

成员资料默认不会公开。只有本人已经同意，并且管理员主动打开对应开关后，相关字段才具备未来公开展示的条件。当前 Phase 1 没有公开成员页面。

请勿在项目中保存身份证号、残疾人证号码、证件扫描件、授权书扫描件或其他不必要的敏感材料。

## 公开投稿

投稿人打开 <http://localhost:3000/submit> 后，无需注册或登录，可以填写：

- 投稿人姓名；
- 笔名（选填）；
- 手机号或微信号；
- 文章标题和作品类别；
- 粘贴的文章正文；
- 补充说明（选填）；
- 原创或投稿授权确认。

提交成功后，页面会显示一个投稿编号。稿件和联系方式不会公开，也不能由未登录用户查询。

Phase 2 只接收粘贴的纯文字，不接收 Word、PDF、图片或其他附件。请勿把真实投稿内容、联系方式或导出的数据库文件加入 Git。

## 投稿管理

管理员登录 <http://localhost:3000/admin> 后，可以在“内容管理”中打开“投稿管理”，完成：

- 查看稿件；
- 将稿件关联到已有成员档案；
- 把状态改为“待审核”“审核中”“退回修改”“已采用”或“不采用”；
- 填写仅后台可见的内部审核意见。

公开投稿人不能设置审核状态、成员关联或审核意见。管理员需要退回修改时，应通过投稿人留下的联系方式人工联系。

本阶段没有投稿账号、进度查询、附件上传、短信或邮件通知、AI处理、新闻搜索、公开作品页面、公众号接口或自动发布。

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

项目运行后，可以使用一组完全虚构的数据检查完整投稿流程：

```bash
pnpm payload run scripts/verify-phase-2.ts
```

该检查会实际投稿、验证防重复、修改审核状态、关联一名虚构成员、检查未登录隐私权限，最后自动删除虚构稿件和虚构成员。

## 停止 PostgreSQL

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl \
  -D .postgres/data \
  stop
```

## 未来 Docker Compose

应用只通过 `DATABASE_URI` 连接数据库，Payload 加密密钥只通过 `PAYLOAD_SECRET` 读取。未来加入 Docker Compose 时可以沿用这两个环境变量，无需重写应用结构。Phase 0 不包含 Docker Compose 文件或容器部署。
