#!/bin/sh
# Untouched sculpt + loincloth, no remesh: drape, bake, preview. Logs to assets/rebuild.log
set -e
cd "$(dirname "$0")/../.."
{
  echo "== 01b drape"; tools/blender/run.sh 01b_drape.py
  echo "== 08 inspect draped"; tools/blender/run.sh 08_inspect.py statue
  echo "== 02 bake"; tools/blender/run.sh 02_bake.py statue
  echo "== 04 preview"; tools/blender/run.sh 04_preview.py statue
  echo "== 11 quality"; tools/blender/run.sh 11_quality_test.py
  echo "== DONE"
} 2>&1 | grep -v "^$" > assets/rebuild.log
