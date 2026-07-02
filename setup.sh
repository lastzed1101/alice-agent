#!/bin/bash
# ============================================================
# Alice AI Agent — One-Command Setup
# ============================================================
# Usage:
#   git clone <repo-url> alice-agent
#   cd alice-agent
#   ./setup.sh
#
# After setup, run from anywhere:
#   alice
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  🐇 Alice AI Agent — Setup              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  ❌ Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "  ✅ Node.js $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "  ❌ npm is required."
  exit 1
fi

NPM_VERSION=$(npm -v)
echo "  ✅ npm $NPM_VERSION"

# Install dependencies
echo ""
echo "  📦 Installing dependencies..."
npm install

# Make CLI executable
chmod +x alice-cli.js

# Link globally so 'alice' command works from anywhere
echo ""
echo "  🔗 Linking 'alice' command globally..."
if ! npm link 2>/dev/null; then
  echo "  ⚠️  npm link failed (try with sudo: sudo npm link)"
  echo "  Or run: npx alice"
fi

# Verify
echo ""
if command -v alice &> /dev/null; then
  echo "  ✅ 'alice' command is ready!"
else
  echo "  ⚠️  'alice' command may not be in your PATH."
  echo "     Try running: npx alice"
fi

# Setup .env if not exists
if [ ! -f .env ]; then
  echo ""
  echo "  📝 Creating .env from template..."
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  ✅ Created .env — edit it with your API keys"
  else
    cat > .env << 'EOF'
# Alice AI Agent Configuration
# Get API keys from your provider dashboard

# Supabase (for cloud sync)
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# OpenRouter (recommended — access to all models)
# OPENROUTER_API_KEY=sk-or-...

# OpenAI (optional)
# OPENAI_API_KEY=sk-...

# Anthropic (optional)
# ANTHROPIC_API_KEY=sk-ant-...
EOF
    echo "  ✅ Created .env — edit it with your API keys"
  fi
fi

echo ""
echo "  ─────────────────────────────────────────"
echo "  🎉 Setup complete!"
echo ""
echo "  Run Alice:"
echo "    alice"
echo ""
echo "  Or with agent server (for shell/filesystem tools):"
echo "    alice --agent"
echo ""
echo "  ─────────────────────────────────────────"
echo ""
