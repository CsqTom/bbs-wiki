#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SCRIPT_DIR"

# 私有仓地址, 可通过 deploy/.env 或命令行覆盖
DEFAULT_REGISTRY_INPUT="http://192.168.0.65:50083"
REGISTRY_INPUT="$DEFAULT_REGISTRY_INPUT"
IMAGE_NAME="bbs-wiki"
IMAGE_TAG="latest"
REMOTE_IMAGE_NAME=""
REGISTRY_HOST=""

if [ -f ".env" ]; then
    # 复用 deploy/.env 中的镜像与仓库配置，避免和 docker-compose 配置脱节。
    # shellcheck disable=SC1091
    source ".env"
fi

IMAGE_NAME="${IMAGE_NAME:-bbs-wiki}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REMOTE_IMAGE_NAME="${REMOTE_IMAGE_NAME:-$IMAGE_NAME}"

if [ -n "${REGISTRY_HOST:-}" ]; then
    REGISTRY_INPUT="$REGISTRY_HOST"
fi

REGISTRY_INPUT="${REGISTRY_INPUT:-$DEFAULT_REGISTRY_INPUT}"

usage() {
    echo "用法: $0 [OPTIONS]"
    echo ""
    echo "说明:"
    echo "  先根据 deploy/.env 中的 IMAGE 配置执行 docker build，成功后自动推送到私有仓。"
    echo ""
    echo "选项:"
    echo "  -r, --registry HOST      私有仓地址，支持 http:// 或 https://"
    echo "                           默认优先取 deploy/.env 中的 REGISTRY_INPUT / REGISTRY_HOST"
    echo "  -i, --image-name NAME    本地镜像名称 (默认: $IMAGE_NAME)"
    echo "  -t, --image-tag TAG      本地镜像标签 (默认: $IMAGE_TAG)"
    echo "  --remote-name NAME       仓库中的镜像名称 (默认: 与本地镜像名称一致)"
    echo "  --skip-login             跳过 docker login"
    echo "  -h, --help               显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0"
    echo "  $0 -t v1.0.0"
    echo "  $0 --remote-name team/bbs-wiki -t v1.0.0"
    echo "  $0 -r http://192.168.0.65:50083 -t v1.0.0"
}

SKIP_LOGIN=false

show_insecure_registry_help() {
    echo ""
    echo "检测到当前仓库为纯 HTTP 仓库: $REGISTRY_HOST"
    echo "Docker push 需要先在 Docker daemon 中把该仓库加入 insecure-registries。"
    echo ""
    echo "Linux 服务器可执行:"
    echo "  sudo mkdir -p /etc/docker"
    echo "  sudo tee /etc/docker/daemon.json > /dev/null <<EOF"
    echo "  {"
    echo "    \"insecure-registries\": [\"$REGISTRY_HOST\"]"
    echo "  }"
    echo "  EOF"
    echo "  sudo systemctl restart docker"
    echo ""
    echo "Docker Desktop 可在 Settings -> Docker Engine 中加入:"
    echo "  \"insecure-registries\": [\"$REGISTRY_HOST\"]"
    echo ""
    echo "配置完成后，可执行以下命令验证:"
    echo "  docker info | grep -A 10 \"Insecure Registries\""
}

check_http_registry_support() {
    if [ "$REGISTRY_SCHEME" != "http" ]; then
        return 0
    fi

    DOCKER_INFO_OUTPUT="$(docker info 2>/dev/null || true)"

    if [ -z "$DOCKER_INFO_OUTPUT" ]; then
        echo "警告: 无法读取 docker info，无法预先确认 insecure-registries 配置。"
        echo "如果后续 push 失败，请按下面提示配置 HTTP 仓库支持。"
        show_insecure_registry_help
        return 0
    fi

    if ! printf '%s\n' "$DOCKER_INFO_OUTPUT" | grep -A 20 "Insecure Registries" | grep -Fq "$REGISTRY_HOST"; then
        echo "错误: Docker daemon 尚未信任该 HTTP 仓库: $REGISTRY_HOST"
        show_insecure_registry_help
        exit 1
    fi
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -r|--registry)
            REGISTRY_INPUT="$2"
            shift 2
            ;;
        -i|--image-name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --remote-name)
            REMOTE_IMAGE_NAME="$2"
            shift 2
            ;;
        --skip-login)
            SKIP_LOGIN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            echo ""
            usage
            exit 1
            ;;
    esac
done

REGISTRY_INPUT="${REGISTRY_INPUT%/}"

case "$REGISTRY_INPUT" in
    http://*)
        REGISTRY_SCHEME="http"
        REGISTRY_HOST="${REGISTRY_INPUT#http://}"
        LOGIN_REGISTRY="$REGISTRY_INPUT"
        ;;
    https://*)
        REGISTRY_SCHEME="https"
        REGISTRY_HOST="${REGISTRY_INPUT#https://}"
        LOGIN_REGISTRY="$REGISTRY_INPUT"
        ;;
    *)
        REGISTRY_SCHEME="https"
        REGISTRY_HOST="$REGISTRY_INPUT"
        LOGIN_REGISTRY="$REGISTRY_INPUT"
        ;;
esac

LOCAL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
REMOTE_IMAGE="${REGISTRY_HOST}/${REMOTE_IMAGE_NAME}:${IMAGE_TAG}"

echo "=========================================="
echo "  Docker 私有仓构建并推送脚本"
echo "=========================================="
echo ""
echo "配置信息:"
echo "  项目根目录:  $PROJECT_ROOT"
echo "  本地镜像:    $LOCAL_IMAGE"
echo "  目标仓库:    $LOGIN_REGISTRY"
echo "  远端镜像:    $REMOTE_IMAGE"
echo ""

echo "步骤 1: 构建本地镜像..."
echo "执行命令: docker build -f deploy/Dockerfile -t $LOCAL_IMAGE ."
(
    cd "$PROJECT_ROOT"
    docker build -f deploy/Dockerfile -t "$LOCAL_IMAGE" .
)
echo "✓ 构建完成"

echo ""
echo "步骤 2: 检查仓库协议支持..."
check_http_registry_support
echo "✓ 仓库协议检查通过"

if [ "$SKIP_LOGIN" != "true" ]; then
    echo ""
    echo "步骤 3: 登录私有仓..."
    echo "将进入 Docker 交互式登录，请按提示输入账号和密码。"
    docker login "$LOGIN_REGISTRY"
    echo "✓ 登录成功"
else
    echo ""
    echo "步骤 3: 已跳过登录"
fi

echo ""
echo "步骤 4: 重新打标签..."
docker tag "$LOCAL_IMAGE" "$REMOTE_IMAGE"
echo "✓ 打标签完成"

echo ""
echo "步骤 5: 推送镜像..."
docker push "$REMOTE_IMAGE"
echo "✓ 推送完成"

echo ""
echo "=========================================="
echo "  构建并推送成功"
echo "=========================================="
echo "远端镜像地址:"
echo "  $REMOTE_IMAGE"
