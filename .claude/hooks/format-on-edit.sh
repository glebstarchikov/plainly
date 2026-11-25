#!/usr/bin/env bash
# PostToolUse(Edit|Write): fast-fix the edited TS/JS file with eslint. Non-blocking, never fails a turn.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$ROOT" || exit 0

file="$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)"
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
[ -d "$ROOT/node_modules" ] || exit 0

npx --no-install eslint --fix "$file" >/dev/null 2>&1 || true
exit 0
