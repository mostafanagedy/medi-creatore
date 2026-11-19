#!/usr/bin/env bash
set -e
cd /home/mstfy/projects/OpenMontage/medi-creatore
export PATH=/home/mstfy/.npm-global/bin:$PATH
export NODE_ENV=development

echo "Starting Medi-Creator + OpenMontage Platform..."
exec /home/mstfy/.npm-global/bin/pnpm turbo run dev --filter=@ai-content-os/api --filter=@ai-content-os/worker --filter=@ai-content-os/web
