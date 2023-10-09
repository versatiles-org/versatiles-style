#!/usr/bin/env bash
cd "$(dirname "$0")/.."

npm run build
cd dist
tar -czf styles.tar.gz *.json
npm run rollup
