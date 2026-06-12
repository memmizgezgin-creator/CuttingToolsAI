#!/bin/bash
# CuttingToolsAI — Night Autopilot
# Queue-based headless Claude Code runner. Executes task files from
# tasks/auto-queue/ one at a time, each on its own branch, merging to main
# only when every VERIFY line in the log is PASS.
#
# Manual run:   ./scripts/autopilot.sh
# Scheduled:    launchd (eu.cuttingtoolsai.autopilot) at 03:30 local time
#
# Safety rails (non-negotiable):
#   - max 5 tasks per night
#   - forbidden-pattern scan before any task runs
#   - repo must be clean before each task (except known local-only files)
#   - strictly sequential — never two tasks in parallel (lock file)
#   - 45-minute hard timeout per task
#   - main is only touched by merges of fully-PASSing tasks + queue bookkeeping

set -u

ROOT="/Users/muratonder/Desktop/ToolAdvisor"
QUEUE_DIR="$ROOT/tasks/auto-queue"
DONE_DIR="$ROOT/tasks/done"
BLOCKED_DIR="$ROOT/tasks/blocked"
MAX_TASKS=5
TASK_TIMEOUT=2700   # 45 minutes, seconds
RUN_DATE=$(date +%F)
LOG_DIR="$ROOT/logs/autopilot/$RUN_DATE"
SUMMARY="$LOG_DIR/summary.md"
LOCK_DIR="/tmp/cuttingtoolsai-autopilot.lock"

# Tracked files that are perpetually dirty on this machine and must not
# block the run (local-only config, gitignored but tracked).
DIRTY_IGNORE_RE='\.claude/settings\.local\.json'

# Forbidden patterns — a queued task containing any of these is moved to
# blocked/ and never executed. Case-insensitive.
FORBIDDEN_PATTERNS=(
  'DROP TABLE'
  'DELETE FROM'
  'supabase db reset'
  'stripe'
  'payment'
  'rm -rf /'
  'secret put'
  'secret set'
)

# --- helpers -----------------------------------------------------------------

log()  { echo "[autopilot $(date +%H:%M:%S)] $*"; }
summ() { echo "$*" >> "$SUMMARY"; }

# Dirty check that ignores known local-only noise. Prints offending lines.
dirty_paths() {
  git status --porcelain | grep -Ev "$DIRTY_IGNORE_RE" | grep -Ev '^\?\? logs/' || true
}

# Run claude headless with a watchdog timeout (macOS has no `timeout`).
# $1 = task file, $2 = log file. Returns claude's exit code; 143 on timeout.
run_claude() {
  local task_file="$1" log_file="$2"
  env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT \
    "$CLAUDE_BIN" -p "$(cat "$task_file")" --dangerously-skip-permissions \
    > "$log_file" 2>&1 &
  local pid=$!
  ( sleep "$TASK_TIMEOUT" && kill -TERM "$pid" 2>/dev/null ) &
  local watchdog=$!
  wait "$pid"
  local rc=$?
  kill "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  return "$rc"
}

finish() {
  rmdir "$LOCK_DIR" 2>/dev/null
}

# --- preconditions -----------------------------------------------------------

cd "$ROOT" || { echo "FATAL: cannot cd to $ROOT"; exit 1; }

# Single-instance lock — repo jobs never run in parallel.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "FATAL: another autopilot run holds $LOCK_DIR — refusing to start."
  exit 1
fi
trap finish EXIT

mkdir -p "$LOG_DIR" "$QUEUE_DIR" "$DONE_DIR" "$BLOCKED_DIR"
: > "$SUMMARY"
summ "# Autopilot summary — $RUN_DATE"
summ ""
summ "Started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
summ ""

# AC power guard (launchd has no native AC-only key; set AUTOPILOT_IGNORE_POWER=1
# for manual daytime runs on battery).
if [ "${AUTOPILOT_IGNORE_POWER:-0}" != "1" ]; then
  if ! pmset -g batt | head -1 | grep -q "AC Power"; then
    log "On battery power — skipping run."
    summ "**Run skipped: machine on battery power.**"
    exit 0
  fi
fi

CLAUDE_BIN=$(command -v claude || true)
[ -z "$CLAUDE_BIN" ] && [ -x /opt/homebrew/bin/claude ] && CLAUDE_BIN=/opt/homebrew/bin/claude
if [ -z "$CLAUDE_BIN" ]; then
  log "FATAL: claude CLI not found."
  summ "**Run BLOCKED: claude CLI not found on PATH.**"
  exit 1
fi

# Collect queue (filename order, README excluded).
QUEUE_FILES=()
while IFS= read -r f; do
  [ "$(basename "$f")" = "README.md" ] && continue
  QUEUE_FILES+=("$f")
done < <(find "$QUEUE_DIR" -maxdepth 1 -name '*.md' 2>/dev/null | sort)

# Note: ${arr[@]+...} guards are for macOS bash 3.2, where set -u treats
# empty arrays as unset.
if [ -z "${QUEUE_FILES+x}" ] || [ ${#QUEUE_FILES[@]} -eq 0 ]; then
  log "Queue empty — nothing to do."
  summ "Queue empty — no tasks executed."
  exit 0
fi

# Dirty-repo guard. Untracked/modified files inside tasks/auto-queue/ are
# allowed (they are the queue itself) and snapshot-committed below.
DIRTY=$(dirty_paths | grep -Ev 'tasks/auto-queue/' || true)
if [ -n "$DIRTY" ]; then
  log "Repo dirty — aborting run. Offending paths:"
  echo "$DIRTY"
  summ "**Run BLOCKED: repo was dirty at start. No tasks executed.**"
  summ ""
  summ '```'
  summ "$DIRTY"
  summ '```'
  exit 1
fi

git checkout -q main

# Snapshot uncommitted queue files so each task branches from a clean main.
if [ -n "$(git status --porcelain -- tasks/auto-queue/)" ]; then
  git add tasks/auto-queue/
  git commit -q -m "chore(autopilot): snapshot queue for $RUN_DATE" --no-verify
fi

# --- forbidden-pattern pre-scan ----------------------------------------------

RUNNABLE=()
for f in ${QUEUE_FILES[@]+"${QUEUE_FILES[@]}"}; do
  hit=""
  for pat in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -Fiq "$pat" "$f"; then hit="$pat"; break; fi
  done
  if [ -n "$hit" ]; then
    base=$(basename "$f")
    log "FORBIDDEN pattern '$hit' in $base — moving to blocked/, will not run."
    {
      echo ""
      echo "---"
      echo "**AUTOPILOT BLOCKED ($RUN_DATE):** forbidden pattern \`$hit\` found. Task was never executed."
    } >> "$f"
    git mv "$f" "$BLOCKED_DIR/$base"
    git add "$BLOCKED_DIR/$base"   # git mv alone doesn't stage the appended reason
    git commit -q -m "chore(autopilot): block $base — forbidden pattern" --no-verify
    summ "## $base — BLOCKED (not run)"
    summ "- Forbidden pattern: \`$hit\`"
    summ ""
  else
    RUNNABLE+=("$f")
  fi
done

# --- main loop ---------------------------------------------------------------

COUNT=0
STOPPED=""
for f in ${RUNNABLE[@]+"${RUNNABLE[@]}"}; do
  base=$(basename "$f")
  name="${base%.md}"

  if [ -n "$STOPPED" ] || [ "$COUNT" -ge "$MAX_TASKS" ]; then
    reason="previous task failed"
    [ "$COUNT" -ge "$MAX_TASKS" ] && reason="nightly cap of $MAX_TASKS reached"
    log "SKIPPED $base ($reason)"
    summ "## $base — SKIPPED"
    summ "- Reason: $reason"
    summ ""
    continue
  fi

  # Repo must be clean before every task.
  DIRTY=$(dirty_paths)
  if [ -n "$DIRTY" ]; then
    log "Repo dirty before $base — aborting run."
    summ "## $base — BLOCKED (dirty repo before start)"
    summ '```'
    summ "$DIRTY"
    summ '```'
    summ ""
    STOPPED="dirty"
    continue
  fi

  COUNT=$((COUNT + 1))
  num=$(printf '%03d' "$COUNT")
  branch="autopilot/$RUN_DATE-$num"
  task_log="$LOG_DIR/$name.log"

  log "[$COUNT/$MAX_TASKS] Running $base on branch $branch (timeout ${TASK_TIMEOUT}s)..."
  git checkout -q -b "$branch" main

  run_claude "$f" "$task_log"
  rc=$?
  timed_out=0
  [ "$rc" -eq 143 ] || [ "$rc" -eq 124 ] && timed_out=1

  # Commit any leftover work on the branch so main can never inherit it.
  if [ -n "$(git status --porcelain | grep -Ev "$DIRTY_IGNORE_RE" | grep -Ev '^\?\? logs/')" ]; then
    git add -A -- ':!logs' ':!.claude/settings.local.json'
    git commit -q -m "autopilot($num): $name — task output" --no-verify
  fi

  # Verdict: PASS only if at least one VERIFY line exists, none say FAIL,
  # and the task did not time out.
  verify_lines=$(grep -E 'VERIFY' "$task_log" | grep -E 'PASS|FAIL' || true)
  fail_count=0; pass_count=0
  if [ -n "$verify_lines" ]; then
    fail_count=$(echo "$verify_lines" | grep -c 'FAIL' || true)
    pass_count=$(echo "$verify_lines" | grep -c 'PASS' || true)
  fi

  verdict="FAIL"
  reason=""
  if [ "$timed_out" -eq 1 ]; then
    reason="timeout after ${TASK_TIMEOUT}s"
  elif [ -z "$verify_lines" ]; then
    reason="no VERIFY PASS/FAIL lines found in log (exit code $rc)"
  elif [ "$fail_count" -gt 0 ]; then
    reason="$fail_count VERIFY line(s) reported FAIL"
  else
    verdict="PASS"
  fi

  git checkout -q main

  if [ "$verdict" = "PASS" ]; then
    if git merge -q --no-ff "$branch" -m "autopilot($num): merge $name [all VERIFY PASS]" --no-verify; then
      git branch -q -d "$branch"
      git mv "$f" "$DONE_DIR/$base"
      git commit -q -m "chore(autopilot): $base PASS → tasks/done/" --no-verify
      log "PASS $base ($pass_count VERIFY pass) — merged to main."
      summ "## $base — PASS"
      summ "- Branch merged to main, queue file → tasks/done/"
      summ "- Log: logs/autopilot/$RUN_DATE/$name.log"
      summ "- Key VERIFY lines:"
      summ '```'
      summ "$verify_lines"
      summ '```'
      summ ""
    else
      git merge --abort 2>/dev/null
      log "FAIL $base — merge conflict; branch $branch left for review."
      git mv "$f" "$BLOCKED_DIR/$base"
      git commit -q -m "chore(autopilot): $base merge conflict → tasks/blocked/" --no-verify
      summ "## $base — FAIL (merge conflict)"
      summ "- Branch \`$branch\` left for morning review; main untouched."
      summ ""
      STOPPED="merge-conflict"
    fi
  else
    log "FAIL $base — $reason. Branch $branch left for review; stopping run."
    git mv "$f" "$BLOCKED_DIR/$base"
    git commit -q -m "chore(autopilot): $base FAIL → tasks/blocked/ ($reason)" --no-verify
    summ "## $base — FAIL"
    summ "- Reason: $reason"
    summ "- Branch \`$branch\` left for morning review; main untouched."
    summ "- Log: logs/autopilot/$RUN_DATE/$name.log"
    if [ -n "$verify_lines" ]; then
      summ "- Key VERIFY lines:"
      summ '```'
      summ "$verify_lines"
      summ '```'
    fi
    summ ""
    STOPPED="task-failed"
  fi
done

summ "Finished: $(date '+%Y-%m-%d %H:%M:%S %Z') — $COUNT task(s) executed."
log "Run complete. Summary: $SUMMARY"
exit 0
