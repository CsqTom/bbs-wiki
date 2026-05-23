# 部署说明

本文说明如何在 `deploy` 目录下完成 Docker 镜像打包、容器启动，以及推送到私有仓库。

## 目录结构

当前部署目录包含以下文件：

- `Dockerfile`：用于构建 `bbs-wiki` 应用镜像
- `docker-compose.yaml`：用于本地或服务器启动容器
- `push_private_registry.sh`：用于将本地镜像推送到私有仓库

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
DATABASE_URL=postgresql://user:password@192.168.0.65:5432/bbs_wiki
AUTH_SECRET="bbs-wiki-auth-secret-change-in-production11"
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:50030

IMAGE_NAME=bbs-wiki
IMAGE_TAG=v2026.5.23
CONTAINER_NAME=bbs-wiki
```

说明：

- `DATABASE_URL`：必填，数据库连接串
- `AUTH_SECRET`：建议填写，NextAuth 使用
- `NEXTAUTH_URL`：建议按实际访问地址填写
- `IMAGE_NAME`、`IMAGE_TAG`：用于 compose 和推送脚本复用

## 方式一：直接打包 Docker 镜像

在项目根目录执行：

```bash
docker build -f deploy/Dockerfile -t bbs-wiki:latest .
```

如果需要自定义镜像标签：

```bash
docker build -f deploy/Dockerfile -t bbs-wiki:v1.0.0 .
```

打包完成后，可通过以下命令查看镜像：

```bash
docker images | grep bbs-wiki
```

## 方式二：使用 docker compose 构建并启动

先进入部署目录：

```bash
cd deploy
```

构建并启动：

```bash
docker compose up -d --build
```

查看运行状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

停止容器：

```bash
docker compose down
```

如果只想重新构建镜像：

```bash
docker compose build
```

## 推送到私有仓库

`push_private_registry.sh` 会读取当前目录下的 `.env`，并复用其中的：

- `IMAGE_NAME`
- `IMAGE_TAG`

进入部署目录后执行：

```bash
cd deploy
bash push_private_registry.sh
```

指定镜像标签：

```bash
bash push_private_registry.sh -t v1.0.0
```

指定远程仓库镜像名：

```bash
bash push_private_registry.sh --remote-name team/bbs-wiki -t v1.0.0
```

指定私有仓地址：

```bash
bash push_private_registry.sh -r http://192.168.0.65:50083 -t v1.0.0
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
docker compose up -d --build
```

部署目录推送私有仓：

```bash
cd deploy
bash push_private_registry.sh
```
