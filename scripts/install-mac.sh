#!/bin/bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Koda can only be installed into /Applications on macOS." >&2
    exit 1
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_app="${repo_dir}/dist/mac-arm64/Koda.app"
destination_app="/Applications/Koda.app"

if [[ ! -d "${source_app}" ]]; then
    echo "Built application not found at ${source_app}." >&2
    exit 1
fi

echo "Installing Koda for all users at ${destination_app}..."
sudo /usr/bin/ditto "${source_app}" "${destination_app}"
sudo /usr/sbin/chown -R root:wheel "${destination_app}"
sudo /bin/chmod -R a+rX "${destination_app}"

echo "Koda was installed successfully at ${destination_app}."
