#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🔄 Obsidian 볼트로부터 최신 노트를 동기화하고 색인을 빌드합니다..."
node scripts/build-data.mjs
echo "✨ 동기화 완료! 개발 서버(localhost:4321)에 즉시 반영되었습니다."
