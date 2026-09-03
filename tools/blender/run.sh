#!/bin/sh
# Run a headless Blender script from the repo root: tools/blender/run.sh 01_normalise.py [args]
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
SCRIPT="$1"; shift
cd "$ROOT"
exec "$BLENDER" -b --python-exit-code 1 -P "tools/blender/$SCRIPT" -- "$@"
