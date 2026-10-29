#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
runtime="$repo_root/.cocoapi-runtime"
exec env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock compose -p cocoapi \
  --project-directory "$runtime" --env-file "$runtime/.env" \
  -f "$repo_root/deploy/cocoapi/compose.yaml" \
  -f "$repo_root/deploy/cocoapi/compose.runtime.json" "$@"
