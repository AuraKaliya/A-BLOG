#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_ROOT=${APP_ROOT:-/root/A-BLOG}
RESOURCE_DIR=${A_BLOG_RESOURCE_DIR:-$APP_ROOT/resource}
IMAGE_TAR=${IMAGE_TAR:-$SCRIPT_DIR/image.tar}
COMPOSE_FILE=${COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.prod.yml}

mkdir -p "$APP_ROOT"

if [ ! -f "$IMAGE_TAR" ]; then
  echo "Missing image tar: $IMAGE_TAR" >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

if [ -f "$SCRIPT_DIR/release.env" ]; then
  CLEAN_ENV=$(mktemp)
  sed '1s/^\xEF\xBB\xBF//' "$SCRIPT_DIR/release.env" > "$CLEAN_ENV"
  set -a
  . "$CLEAN_ENV"
  set +a
  rm -f "$CLEAN_ENV"
fi

RUNTIME_ENV=${A_BLOG_RUNTIME_ENV:-$APP_ROOT/runtime.env}
if [ -f "$RUNTIME_ENV" ]; then
  CLEAN_RUNTIME_ENV=$(mktemp)
  sed '1s/^\xEF\xBB\xBF//' "$RUNTIME_ENV" > "$CLEAN_RUNTIME_ENV"
  set -a
  . "$CLEAN_RUNTIME_ENV"
  set +a
  rm -f "$CLEAN_RUNTIME_ENV"
elif [ -n "${DJANGO_SECRET_KEY:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${A_BLOG_VIEW_SALT:-}" ]; then
  umask 077
  {
    printf '%s\n' "DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY"
    printf '%s\n' "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
    printf '%s\n' "A_BLOG_VIEW_SALT=$A_BLOG_VIEW_SALT"
  } > "$RUNTIME_ENV"
fi

export A_BLOG_CONTAINER=${A_BLOG_CONTAINER:-aura-blog}
export A_BLOG_BIND=${A_BLOG_BIND:-127.0.0.1}
export A_BLOG_PORT=${A_BLOG_PORT:-8080}
export A_BLOG_RESOURCE_DIR=${A_BLOG_RESOURCE_DIR:-$RESOURCE_DIR}
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-aura-blog}

mkdir -p "$A_BLOG_RESOURCE_DIR"

echo "Loading Docker image from $IMAGE_TAR"
docker load -i "$IMAGE_TAR"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Docker Compose is not installed." >&2
    exit 1
  fi
}

if docker container inspect "$A_BLOG_CONTAINER" >/dev/null 2>&1; then
  echo "Removing existing container $A_BLOG_CONTAINER"
  docker rm -f "$A_BLOG_CONTAINER"
fi

echo "Starting container $A_BLOG_CONTAINER on $A_BLOG_BIND:$A_BLOG_PORT"
compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Done. Local health check:"
if command -v curl >/dev/null 2>&1; then
  curl -fsSI "http://127.0.0.1:$A_BLOG_PORT/" | head -n 1 || true
fi
