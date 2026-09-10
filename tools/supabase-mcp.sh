#!/bin/sh
# Supabase MCP를 read-only로 띄운다.
#
# service_role 키는 쓰지 않는다. RLS를 우회하므로 연결되는 순간 RLS 검증이
# 무의미해진다. supabase CLI가 keychain에 넣어둔 개인 액세스 토큰을 쓴다.
set -eu

# keychain이 없는 환경(리눅스·CI)에서는 환경변수를 그대로 쓴다.
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  TOKEN=$SUPABASE_ACCESS_TOKEN
else
  TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w 2>/dev/null) || {
    echo "keychain에서 Supabase 토큰을 찾지 못했다. 'npx supabase login'을 먼저 실행하거나 SUPABASE_ACCESS_TOKEN을 설정하라." >&2
    exit 1
  }
fi

# project ref는 .env의 URL에서 뽑는다. 비밀값이 아니고, 기기마다 다를 수 있어
# 하드코딩하지 않는다.
ENV_FILE="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)/.env"
REF=$(sed -n 's#^EXPO_PUBLIC_SUPABASE_URL=https://\([^.]*\)\..*#\1#p' "$ENV_FILE" 2>/dev/null || true)
[ -n "$REF" ] || {
  echo "$ENV_FILE 의 EXPO_PUBLIC_SUPABASE_URL에서 project ref를 읽지 못했다." >&2
  exit 1
}

# 토큰은 환경변수로 넘긴다. --access-token으로 주면 argv에 남아 ps로 보인다.
# --features=database 로 계정·브랜치·스토리지 도구를 제외해 토큰 영향 범위를 줄인다.
SUPABASE_ACCESS_TOKEN="$TOKEN" \
  exec npx -y @supabase/mcp-server-supabase@latest \
  --read-only \
  --features=database \
  --project-ref="$REF"
