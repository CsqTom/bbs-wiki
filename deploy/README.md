# 部署说明

本文说明如何在 `deploy` 目录下完成 Docker 镜像打包、容器启动，以及推送到私有仓库。

## 目录结构

当前部署目录包含以下文件：

- `Dockerfile`：用于构建 `bbs-wiki` 应用镜像
- `docker-compose.yaml`：用于本地或服务器启动容器
- `build_push_private_registry.sh`：用于构建本地镜像并推送到私有仓库

## 前置要求

部署机器需要提前安装：

- Docker
- Docker Compose

如果需要推送私有仓，还需要：

- 可以正常执行 `docker login`
- 私有仓库地址、账号、密码

## 默认端口

当前项目已统一使用端口 `50030`：

- `pnpm dev`：`50030`
- `pnpm start`：`50030`
- Docker 容器端口：`50030`
- Docker 对外映射端口：`50030`

启动后默认访问地址：

```text
http://localhost:50030
```

## 环境变量

推荐在 `deploy` 目录下创建 `.env` 文件，至少配置以下变量：

```env
DATABASE_URL=postgresql://postgres:postgres@paradedb:5432/bbs_wiki
AUTH_SECRET="bbs-wiki-auth-secret-change-in-production11"
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:50030
REGISTRATION_CODE="your-registration-code"

DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bbs_wiki
DB_PORT=5432

IMAGE_NAME=bbs-wiki
IMAGE_TAG=v2026.5.23
CONTAINER_NAME=bbs-wiki
```

说明：

- `DATABASE_URL`：必填，数据库连接串。compose 启动时使用 `postgresql://postgres:postgres@paradedb:5432/bbs_wiki` 自动连接 ParadeDB 容器
- `AUTH_SECRET`：建议填写，NextAuth 使用
- `NEXTAUTH_URL`：建议按实际访问地址填写
- `REGISTRATION_CODE`：注册码，留空或删除则关闭注册校验
- `DB_USER`、`DB_PASSWORD`、`DB_NAME`、`DB_PORT`：ParadeDB 数据库配置，需与 `DATABASE_URL` 对应
- `IMAGE_NAME`、`IMAGE_TAG`、`CONTAINER_NAME`：用于 compose 与构建推送脚本复用
- `REGISTRY_HOST` 或 `REGISTRY_INPUT`：可选，私有仓地址，供构建推送脚本默认读取
- ParadeDB 容器首次启动会自动创建数据库和用户，数据持久化在 Docker volume 中
- 容器启动时会自动执行 `pnpm prisma db push`，用于自动创建/同步表结构
- 容器启动时会自动执行 `pnpm db:seed`，用于初始化默认管理员

## 方式一：直接打包 Docker 镜像

在项目根目录执行：

```bash
docker build -f deploy/Dockerfile -t bbs-wiki:latest .
```

如果需要自定义镜像标签：

```bash
docker build -f deploy/Dockerfile -t bbs-wiki:v1.0.0 .
或
docker build --no-cache -f deploy/Dockerfile -t bbs-wiki:v2026.5.23 .
```

打包完成后，可通过以下命令查看镜像：

```bash
docker images | grep bbs-wiki
```

也可以直接使用下面的脚本自动完成“构建 + 推送”。

## 方式二：使用 docker compose 拉取并启动

先进入部署目录：

```bash
cd deploy
```

拉取并启动：

```bash
docker compose pull
docker compose up -d
```

查看运行状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

说明：

- 当前方案使用 ParadeDB（PostgreSQL 兼容，内置 pgvector 和全文搜索增强）
- 数据库作为 compose 服务自动启动，无需预先准备外部数据库
- ParadeDB 容器首次启动会自动创建数据库和用户
- 数据库数据持久化在 Docker volume `paradedb_data` 中
- 用户上传的头像与 Wiki 图片会持久化在 Docker volume `bbs_wiki_uploads` 中，对应容器目录 `/app/public/uploads`
- 容器启动时会先等 ParadeDB 就绪（healthcheck），再执行 `prisma db push`、`db:seed`，最后启动 Next.js
- 默认管理员会自动初始化：
  - 邮箱：`admin@bbs-wiki.com`
  - 密码：`admin123`
  - 角色：`ADMIN`
- 默认管理员已做成可重复执行，不会因重启容器而重复创建

停止容器：

```bash
docker compose down
```

如果只想重新拉取最新镜像：

```bash
docker compose pull
```

如果需要连同上传文件一起清理，请谨慎执行：

```bash
docker compose down -v
```

说明：
- `docker compose down` 不会删除 `paradedb_data` 和 `bbs_wiki_uploads`
- `docker compose down -v` 会同时删除数据库数据和上传文件数据

## 构建并推送到私有仓库

`build_push_private_registry.sh` 会读取当前目录下的 `.env`，并复用其中的：

- `IMAGE_NAME`
- `IMAGE_TAG`
- `REMOTE_IMAGE_NAME`（可选）
- `REGISTRY_HOST` 或 `REGISTRY_INPUT`（可选）

脚本内部会先在项目根目录执行：

```bash
docker build -f deploy/Dockerfile -t ${IMAGE_NAME}:${IMAGE_TAG} .
```

构建成功后，再自动完成 `docker login`、`docker tag`、`docker push`。

进入部署目录后执行：

```bash
cd deploy
bash build_push_private_registry.sh
```

指定镜像标签：

```bash
bash build_push_private_registry.sh -t v1.0.0
```

指定远程仓库镜像名：

```bash
bash build_push_private_registry.sh --remote-name team/bbs-wiki -t v1.0.0
```

指定私有仓地址：

```bash
bash build_push_private_registry.sh -r http://192.168.0.65:50083 -t v1.0.0
```

## HTTP 私有仓说明

如果私有仓库是 `http://`，需要先在 Docker daemon 中加入 `insecure-registries`，否则推送会失败。

Linux 示例：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "insecure-registries": ["192.168.0.65:50083"]
}
EOF
sudo systemctl restart docker
```

配置完成后可执行：

```bash
docker info | grep -A 10 "Insecure Registries"
```

## 常用命令汇总

项目根目录打包：

```bash
docker build -f deploy/Dockerfile -t bbs-wiki:latest .
```

部署目录启动：

```bash
cd deploy
docker compose pull
docker compose up -d
```

部署目录推送私有仓：

```bash
cd deploy
bash build_push_private_registry.sh
```
