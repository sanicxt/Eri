# Eri Discord Music Bot — Docker image for IBM LinuxONE (s390x)
#
# Build · docker compose build
# Start · docker compose up -d
# Logs  · docker compose logs -f
#
# Native modules ship prebuilt binaries for x86_64/aarch64 but not for
# s390x.  The builder stage provides the toolchain (g++, python3, make,
# pkg-config) so node-gyp can compile them from source.
#
# Opus codec strategy for s390x
# ──────────────────────────────
# @discord-player/opus tries backends in this order:
#   • mediaplex      – no prebuilt binary for s390x (skipped)
#   • @discordjs/opus – bundled libopus fails to compile (config.h missing)
#   • opusscript     – WASM binary crashes ("memory access out of bounds")
#   • @evan/opus     – native tries first, then falls back to its own WASM
#   • node-opus      – same config.h problem as @discordjs/opus
#
# We remove opusscript from node_modules after npm install so the chain
# falls through to @evan/opus, which has a newer WASM build that may
# run correctly on s390x.  If it still crashes, remove @evan/opus from
# package.json and rely on FFmpeg's libopus encoder instead.
#
# DAVE protocol (discord-voip)
# ────────────────────────────
# @snazzah/davey is a native addon.  If it fails to compile from source,
# remove it from package.json — discord-voip will fall back to the legacy
# WebSocket voice transport.

FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++             \
    pkg-config libopus-dev       \
    ffmpeg                       \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /eri
COPY . .
RUN npm install --omit=dev       \
  && rm -rf node_modules/opusscript node_modules/.cache

# ---- runtime ----
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libopus0              \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r eri && useradd -r -g eri eri

WORKDIR /eri
COPY --chown=eri:eri --from=builder /eri ./

USER eri
CMD ["node", "eri.js"]
