#!/bin/bash

set -e

echo "🚀 Setting up Danmaku Anywhere development environment..."

# Install pnpm globally
echo "📦 Installing pnpm..."
npm install -g pnpm@latest

# Verify pnpm installation
pnpm --version

# Install dependencies for the entire monorepo
echo "📥 Installing dependencies..."
pnpm install

# Install Angular CLI globally for development
echo "🅰️ Installing Angular CLI..."
pnpm add -g @angular/cli@latest

# Install Astro CLI globally for documentation development  
echo "🚀 Installing Astro CLI..."
pnpm add -g astro@latest

# Install Cloudflare Wrangler for Workers development
echo "☁️ Installing Wrangler..."
pnpm add -g wrangler@latest

# Install browser automation tools for extension testing
echo "🌐 Installing Playwright for browser automation..."
pnpm add -g playwright@latest
npx playwright install chromium

# Install useful development tools
echo "🔧 Installing development tools..."
pnpm add -g typescript@latest
pnpm add -g tsx@latest
pnpm add -g concurrently@latest

# Create useful aliases
echo "📝 Setting up aliases..."
cat >> ~/.zshrc << 'EOF'

# Danmaku Anywhere Development Aliases
alias pdev="pnpm run dev"
alias pbuild="pnpm run build" 
alias ptest="pnpm run test"
alias plint="pnpm run lint"
alias pformat="pnpm run format"

# Angular specific
alias ng-dev="cd app/web && pnpm run dev"
alias ng-build="cd app/web && pnpm run build"
alias ng-test="cd app/web && pnpm run test"

# Extension specific  
alias ext-dev="cd packages/danmaku-anywhere && pnpm run dev"
alias ext-build="cd packages/danmaku-anywhere && pnpm run build"

# Backend specific
alias backend-dev="cd backend/proxy && pnpm run dev"
alias backend-deploy="cd backend/proxy && pnpm run deploy"

# Documentation specific
alias docs-dev="cd docs && pnpm run dev"
alias docs-build="cd docs && pnpm run build"

# Workspace management
alias workspace-clean="pnpm run clean"
alias workspace-fresh="pnpm run clean && pnpm install"
EOF

# Set up git hooks if lefthook is available
if command -v lefthook &> /dev/null; then
    echo "🪝 Setting up git hooks..."
    lefthook install
fi

# Display useful information
echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🔗 Available commands:"
echo "  pdev      - Run development server"
echo "  ng-dev    - Run Angular app development server"
echo "  ext-dev   - Run extension development server"
echo "  docs-dev  - Run documentation development server"
echo "  backend-dev - Run backend development server"
echo ""
echo "📂 Project structure:"
echo "  app/web/                  - Angular web application"
echo "  packages/danmaku-anywhere/ - Browser extension (React)"
echo "  backend/proxy/            - Cloudflare Workers backend"
echo "  packages/                 - Core TypeScript packages"
echo ""
echo "🚀 Ready to start developing! Try running 'pdev' to start all development servers." 