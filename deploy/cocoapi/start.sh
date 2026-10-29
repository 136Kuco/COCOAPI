#!/usr/bin/env bash
set -euo pipefail
helper_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bash "$helper_dir/compose.sh" up -d --wait --wait-timeout 120
python3 "$helper_dir/check.py"
