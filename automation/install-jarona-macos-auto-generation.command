#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_SCRIPT="$PROJECT_DIR/automation/run-jarona-scheduled.sh"
PLIST_PATH="$HOME/Library/LaunchAgents/com.jarona.autogenerate.plist"
LOG_PATH="$PROJECT_DIR/data/jarona-scheduler.log"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install it from https://nodejs.org and try again."
  read -r -p "Press Enter to close..."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$PROJECT_DIR/data"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.jarona.autogenerate</string>
  <key>ProgramArguments</key>
  <array>
    <string>$RUN_SCRIPT</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$PROJECT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>StandardOutPath</key>
  <string>$LOG_PATH</string>
  <key>StandardErrorPath</key>
  <string>$LOG_PATH</string>
</dict>
</plist>
EOF

chmod +x "$RUN_SCRIPT"
launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

echo ""
echo "Jarona background auto-generation is now installed on this Mac."
echo "It checks once every hour, catches up after login, and only generates after each profile reaches its auto-generate time."
echo "Log file: $LOG_PATH"
echo "LaunchAgent file: $PLIST_PATH"
read -r -p "Press Enter to close..."
