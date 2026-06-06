# Eri Discord Music Bot — Docker image for IBM LinuxONE (s390x)
#
# Build · docker compose build
# Start · docker compose up -d
# Logs  · docker compose logs -f
#
# Native modules (mediaplex, @discord-player/opus, @snazzah/davey) ship
# prebuilt binaries for x86_64/aarch64 but not for s390x.  The builder
# stage provides the full toolchain so node-gyp can compile them from
# source against system libraries.
#
# Known s390x pitfalls
# ───────────────────
# • opusscript (WASM) — crashes with "memory access out of bounds".
#   We install libopus-dev so mediaplex links against real libopus
#   instead of falling back to the broken WASM codec.
# • @snazzah/davey — native TCP/UDP DAVE protocol addon.  If gyp fails
#   to compile it (missing headers, arch-specific intrinsics), the
#   container will fail on every voice connection.  The fallback is
#   to remove @snazzah/davey from package.json and use the legacy
#   WebSocket voice transport (discord-voip will auto-negotiate).

FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++             \
    pkg-config libopus-dev       \
    ffmpeg                       \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /eri
COPY . .
RUN npm install --omit=dev       \
  && rm -rf node_modules/.cache

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
