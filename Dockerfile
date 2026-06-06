# Multi-arch (amd64 + arm64) Discord music bot.
#
# Build · docker compose build
# Start · docker compose up -d
# Logs  · docker compose logs -f
#
# Prebuilt native binaries ship for both architectures:
#   • mediaplex            — audio metadata + native opus
#   • @snazzah/davey       — DAVE protocol (optional, fails safely)
#   • opusscript / @evan/opus  — opus codec fallbacks
#
# No source compilation is needed; npm install pulls the right
# platform-specific optional dep automatically.

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libopus0 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /eri

COPY --chown=node:node . .
USER node

RUN npm install --omit=dev && rm -rf node_modules/.cache

ENV FFMPEG_PATH=/usr/bin/ffmpeg \
    NODE_ENV=production

CMD ["node", "eri.js"]
