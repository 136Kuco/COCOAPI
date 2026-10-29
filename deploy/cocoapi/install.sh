#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
python3 - "$repo_root" <<'PY'
from pathlib import Path
import secrets,sys
runtime=Path(sys.argv[1])/'.cocoapi-runtime'
runtime.mkdir(mode=0o700,exist_ok=True)
f=runtime/'.env'
if not f.exists():
    f.write_text(chr(10).join(['BIND_HOST=127.0.0.1','SERVER_PORT=8080','TZ=Asia/Shanghai','ADMIN_EMAIL=admin@cocoapi.local','ADMIN_PASSWORD='+secrets.token_urlsafe(32),'POSTGRES_PASSWORD='+secrets.token_hex(32),'REDIS_PASSWORD='+secrets.token_hex(32),'JWT_SECRET='+secrets.token_hex(32),'TOTP_ENCRYPTION_KEY='+secrets.token_hex(32),'SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP=false','SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=false','']))
    f.chmod(0o600)
print('Runtime configuration present; existing credentials and data preserved.')
PY
bash "$repo_root/deploy/cocoapi/compose.sh" pull --quiet
