#!/bin/bash

set -e

echo "🚀 Starting AI Dev Environment Setup..."

PROJECT_DIR=$(pwd)

echo "📁 Project: $PROJECT_DIR"

# -------------------------------
# 1. GRAPHIFY SETUP
# -------------------------------
echo ""
echo "🧠 Setting up Graphify..."

if command -v graphify >/dev/null 2>&1; then
  graphify update . || echo "⚠️ Graphify update failed (continuing...)"
  graphify cluster-only . || echo "⚠️ Graphify clustering failed (safe to ignore)"
else
  echo "❌ Graphify not installed. Skipping..."
fi

# -------------------------------
# 2. CODE REVIEW GRAPH SETUP
# -------------------------------
echo ""
echo "🔍 Setting up Code Review Graph..."

if command -v code-review-graph >/dev/null 2>&1; then
  code-review-graph init || echo "⚠️ CRG init failed (maybe already initialized)"
  code-review-graph build || echo "⚠️ CRG build failed"
else
  echo "❌ code-review-graph not found in PATH"
fi

# -------------------------------
# 3. CLAUDE INTEGRATION
# -------------------------------
echo ""
echo "🤖 Setting up Claude integration..."

if command -v graphify >/dev/null 2>&1; then
  graphify claude install || echo "⚠️ Claude install via Graphify failed"
fi

mkdir -p .claude

cat > .claude/settings.json <<EOF
{
  "mcpServers": {
    "code-review-graph": {
      "command": "code-review-graph",
      "args": ["serve"]
    }
  }
}
EOF

echo "✅ Claude MCP config created"

# -------------------------------
# 4. AGENTS CONFIG (SKILLS)
# -------------------------------
echo ""
echo "🧩 Creating AGENTS.md..."

cat > AGENTS.md <<EOF
Skills enabled:

- clean-code
- debugging
- refactoring
- security-review
- testing

Rules:
- Always apply clean-code during implementation
- Always apply security-review for auth/payment logic
- Always suggest tests after implementation
EOF

echo "✅ AGENTS.md created"

# -------------------------------
# 5. SYSTEM PROMPT
# -------------------------------
echo ""
echo "🧠 Creating SYSTEM_PROMPT.md..."

cat > SYSTEM_PROMPT.md <<EOF
Using the Graphify context:

1. Identify relevant modules and dependencies
2. Break tasks into steps
3. Classify each step (SIMPLE/MODERATE/COMPLEX)

Execution rules:
- SIMPLE → fast model
- COMPLEX → reasoning model

After implementation:
- Use Code Review Graph to analyze changes
- Detect blast radius
- Identify missing tests
- Validate system integrity

Apply skills:
- clean-code
- security-review
- debugging
- testing
EOF

echo "✅ SYSTEM_PROMPT.md created"

# -------------------------------
# 6. NODE AUTOMATION (optional)
# -------------------------------
if [ -f package.json ]; then
  echo ""
  echo "📦 Updating package.json scripts..."

  TMP=$(mktemp)

  jq '.scripts += {
    "graph:update": "graphify update .",
    "graph:watch": "graphify watch .",
    "crg:build": "code-review-graph build",
    "crg:watch": "code-review-graph watch",
    "crg:serve": "code-review-graph serve"
  }' package.json > "$TMP" && mv "$TMP" package.json

  echo "✅ package.json updated"
else
  echo ""
  echo "ℹ️ No package.json found, skipping Node scripts"
fi

# -------------------------------
# DONE
# -------------------------------
echo ""
echo "🎉 SETUP COMPLETE!"
echo ""

echo "👉 NEXT STEPS:"
echo ""
echo "1. Start Graphify watcher:"
echo "   graphify watch ."
echo ""
echo "2. Start Code Review Graph:"
echo "   code-review-graph watch"
echo "   code-review-graph serve"
echo ""
echo "3. Open Claude Code in this project"
echo ""
echo "4. Use this prompt pattern:"
echo ""
echo "   Using the Graphify context:"
echo "   - Identify modules"
echo "   - Break into steps"
echo "   - Implement"
echo "   - Validate with Code Review Graph"
echo ""
echo "🔥 You're now running a full AI engineering system."