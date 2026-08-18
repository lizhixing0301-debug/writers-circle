# Writers Circle Phase 7 Docker Compose 设计

## 目标

让项目在保留现有本机开发方式的前提下，可以用 Docker Compose 同时启动网站和 PostgreSQL，并确保数据库与上传图片在容器重启后保留。

## 运行结构

- `postgres`：固定为 PostgreSQL 18，使用命名卷 `postgres_data` 保存数据库。
- `migrate`：一次性运行 Payload 数据库迁移；仅在 `postgres` 健康后启动。
- `app`：使用 Next.js standalone 生产镜像，只有迁移成功才启动；对外端口默认 3000。
- `media_data`：挂载到 `/app/media`，作为 Payload 图片资源的唯一存储位置。

## 安全与可维护性

- 真实配置仅保存在被 Git 忽略的 `.env.docker`；仓库只提交 `.env.docker.example` 占位符。
- 不把数据库密码、Payload Secret 或搜索 Token 写入 Dockerfile、Compose 文件或镜像层。
- 增加 `/api/health`：只返回应用及数据库可用状态，不返回数据库内容、异常详情或任何密钥。
- 增加 `.dockerignore`，避免将本机依赖、构建结果、数据库、上传文件和环境文件打包进镜像。
- 本阶段不增加公网服务器、域名、HTTPS、反向代理、定时任务或业务功能。

## 数据库演进

建立 Payload 迁移目录并生成当前数据结构的初始迁移。开发数据库继续可按既有方式使用；新的 Docker 数据库在首次启动时由 `migrate` 服务创建结构。之后修改集合字段时，必须生成新的迁移后再部署。

## 使用方式

Docker Desktop 运行后，项目所有人只需复制 `.env.docker.example` 为 `.env.docker`、填入自己的真实值，然后运行 `pnpm docker:up`。常用命令包括查看日志、停止服务、执行迁移和导出本地 Docker 数据库备份。

## 验收

- 配置测试证明 Compose 使用健康检查、持久卷、迁移服务、无密码占位符及忽略规则。
- 健康检查测试证明健康和数据库不可用时的响应均不泄露错误信息。
- Docker 实测启动一个全新项目栈，检查首页、后台、公开页面和健康接口；重启后检查数据卷仍存在。
- 运行现有全量单元测试、代码检查、类型生成和生产构建。
