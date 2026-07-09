#!/usr/bin/env bash
#
# deploy-to-github.sh — Push SentriAgent source to your GitHub repo
#
# Usage (from Termux):
#   1. Download sentriagent-source.tar.gz (link below)
#   2. Run this script from the same directory as the tarball
#   3. Provide your GitHub PAT when prompted
#
set -euo pipefail

REPO="Donyemiight/sentriagent"
TARBALL="sentriagent-source.tar.gz"
BRANCH="main"

echo "🚀 SentriAgent → GitHub deploy"
echo "   Target: $REPO ($BRANCH)"
echo ""

# Check tarball exists
if [ ! -f "$TARBALL" ]; then
  echo "❌ $TARBALL not found"
  echo "Download it from the link your agent shared, then re-run"
  exit 1
fi

# Ask for PAT (hidden input)
echo -n "GitHub Personal Access Token (repo scope): "
read -rs GITHUB_PAT
echo ""

if [ -z "$GITHUB_PAT" ]; then
  echo "❌ No token provided"
  exit 1
fi

# Extract tarball
echo "📦 Extracting source..."
tar -xzf "$TARBALL" -C /tmp/
SOURCE_DIR="/tmp/sentriagent"

# Create empty repo via API (idempotent — ignore 422 if exists)
echo "📝 Ensuring repo $REPO exists..."
curl -s -X POST "https://api.github.com/user/repos" \
  -H "Authorization: token $GITHUB_PAT" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "{\"name\":\"sentriagent\",\"description\":\"SentriAgent — Trust-as-a-Service for AI Agents (OKX.AI Genesis Hackathon)\",\"private\":false}" \
  -o /dev/null -w "  HTTP %{http_code} (422 = already exists, that's fine)\n"

# Use git to push
cd "$SOURCE_DIR"

git init -q
git config user.email "yemiight777@yahoo.com"
git config user.name "Olaniyan Oluyemi"
git checkout -q -b "$BRANCH"

git add -A
git commit -q -m "Initial SentriAgent release

- MCP server with 4 risk tools (assess_token, assess_wallet, assess_tx, bundle_assess)
- Multi-source signal fusion (OKX onchainos-mcp, GoPlus, De.Fi)
- x402/APP pay-per-call integration
- Fastify HTTP API + landing page + docs
- 7 chains supported (Ethereum, BSC, Polygon, Arbitrum, Base, X Layer, Solana)
- Fly.io deploy config + Dockerfile
- Built for OKX AI Genesis Hackathon 2026"

# Push using token in URL (works in Termux)
echo "⬆️  Pushing to GitHub..."
git remote add origin "https://$GITHUB_PAT@github.com/$REPO.git"
git push -u origin "$BRANCH" --force

echo ""
echo "✅ Done! Repo live at: https://github.com/$REPO"
echo ""
echo "Next steps:"
echo "  1. Visit https://github.com/$REPO and verify"
echo "  2. Set up Fly.io deployment (I have the configs ready)"
echo "  3. Configure DNS on Cloudflare (token already saved)"
echo "  4. Submit ASP listing on okx.ai"