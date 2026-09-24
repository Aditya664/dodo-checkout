#!/usr/bin/env bash
set -euo pipefail

checkout_dir="checkout"
demo_dir="demo"

npm --prefix "$checkout_dir" ci
npm --prefix "$checkout_dir" run build

npm --prefix "$demo_dir" ci
npm --prefix "$demo_dir" run build

rm -rf "$demo_dir/dist/checkout"
mkdir -p "$demo_dir/dist/checkout"
cp -R "$checkout_dir/dist/." "$demo_dir/dist/checkout/"

echo "Render bundle created at $demo_dir/dist"
