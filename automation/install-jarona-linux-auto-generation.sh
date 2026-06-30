#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_SCRIPT="$PROJECT_DIR/automation/run-jarona-scheduled.sh"
LOG_PATH="$PROJECT_DIR/data/jarona-scheduler.log"
CRON_TAG="JARONA_AUTO_GENERATE"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install it from https://nodejs.org and try again."
  exit 1
fi

mkdir -p "$PROJECT_DIR/data"
chmod +x "$RUN_SCRIPT"

CRON_LINE="0 * * * * /bin/bash \"$RUN_SCRIPT\" >> \"$LOG_PATH\" 2>&1 # $CRON_TAG"
(crontab -l 2>/dev/null | grep -v "$CRON_TAG" || true; echo "$CRON_LINE") | crontab -

echo ""
echo "Jarona background auto-generation is now installed on this Linux machine."
echo "It checks once every hour and only generates after each profile reaches its auto-generate time."
echo "Log file: $LOG_PATH"
