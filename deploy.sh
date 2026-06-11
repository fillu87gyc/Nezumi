#!/bin/bash
set -e

echo "📦 フロントエンドビルド..."
pnpm build

echo "🗄️ D1 マイグレーション..."
wrangler d1 migrations apply nezumi-db --remote

echo "🚀 Workers デプロイ..."
wrangler deploy

echo "✅ デプロイ完了"
