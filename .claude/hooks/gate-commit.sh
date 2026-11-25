#!/usr/bin/env bash
# PreToolUse(Bash): if the command is a `git commit`, run the quality gate and DENY the commit on failure.
# Fail-OPEN if node_modules is missing, so a fresh clone can never lock out commits.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$ROOT" || exit 0

cmd="$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)"
# Match `git commit`, `git -c x=y commit`, `git -C path commit` — but NOT `git log --grep=commit` etc.
is_commit="$(printf '%s' "$cmd" | python3 -c 'import sys,re; print("yes" if re.search(r"\bgit\b(?:\s+-\S+|\s+-c\s+\S+|\s+-C\s+\S+)*\s+commit\b", sys.stdin.read()) else "no")' 2>/dev/null || echo no)"
[ "$is_commit" = "yes" ] || exit 0

[ -d "$ROOT/node_modules" ] || exit 0   # no deps installed → don't gate (fail open)

out="${TMPDIR:-/tmp}/plainly-commit-gate.txt"; : > "$out"; fails=""
npm run --silent lint      >>"$out" 2>&1 || fails="${fails}eslint "
npx --no-install tsc --noEmit >>"$out" 2>&1 || fails="${fails}tsc "

if [ -n "$fails" ]; then
  FAILS="$fails" OUT="$out" python3 -c 'import json,os; print(json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Commit blocked — quality gate failed: "+os.environ["FAILS"].strip()+". Details in "+os.environ["OUT"]+". Fix, then commit again."}}))'
  exit 0
fi
exit 0
