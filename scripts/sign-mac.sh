#!/bin/bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Koda can only be signed for macOS on macOS." >&2
    exit 1
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_path="${repo_dir}/dist/mac-arm64/Koda.app"

if [[ ! -d "${app_path}" ]]; then
    echo "Built application not found at ${app_path}." >&2
    exit 1
fi

echo "Applying a local ad-hoc signature to Koda..."
/usr/bin/xattr -cr "${app_path}"
# Keep a stable designated requirement across ad-hoc development builds so
# macOS can retain Files and Folders permissions when the binary changes.
# Sign nested Electron code first, then re-sign the outer app with its stable
# requirement. Applying the outer requirement during --deep signing would also
# apply it to helpers and frameworks, invalidating the bundle.
/usr/bin/codesign --force --deep --sign - "${app_path}"
/usr/bin/codesign \
    --force \
    --sign - \
    --requirements '=designated => identifier "com.ertucode.koda"' \
    "${app_path}"
/usr/bin/codesign --verify --deep --strict "${app_path}"

echo "Koda was signed successfully."
