#!/bin/bash
export NODE_OPTIONS="--max-old-space-size=1024"

# Installer seulement les dépendances essentielles
pnpm install --frozen-lockfile --ignore-scripts \
  @n8n/core \
  @n8n/workflow \
  @n8n/cli

# Builder seulement les composants essentiels
pnpm run build --filter=@n8n/core --filter=@n8n/workflow

# Démarrer n8n
node packages/cli/bin/n8n
