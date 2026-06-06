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
#   • opusscript     – WASM binary crashes ("memory access out of bounds");
#                       physically removed from node_modules after npm install
#   • @evan/opus     – native tries first, then falls back to its own WASM
#   • @discordjs/opus – bundled libopus fails to compile (config.h missing;
#                        not installed)
#
# DAVE protocol (discord-voip)
# ────────────────────────────
# @snazzah/davey has explicit s390x support in its loader but the
# @snazzah/davey-linux-s390x-gnu binary package was never published.
# The loader falls back to @snazzah/davey-wasm32-wasi (a WASM build),
# but npm skips it because its platform is "wasi/wasm32", not "linux/s390x".
#
# We grab the WASI tarball from npm, extract the .cjs loader and .wasm
# binary into @snazzah/davey/, and the loader picks them up automatically.

FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ curl       \
    ca-certificates openssl      \
    pkg-config libopus-dev       \
    ffmpeg                       \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /eri
COPY . .
RUN npm install --omit=dev       \
  && rm -rf node_modules/opusscript node_modules/.cache

# ---- inject DAVE WASI fallback for s390x ----
RUN DAVEY_WASI_VER=0.1.11 && \
    mkdir -p /tmp/davey-wasi && \
    curl -fsSL "https://registry.npmjs.org/@snazzah/davey-wasm32-wasi/-/davey-wasm32-wasi-${DAVEY_WASI_VER}.tgz" \
      -o /tmp/davey-wasi.tgz && \
    tar xzf /tmp/davey-wasi.tgz -C /tmp/davey-wasi && \
    cp /tmp/davey-wasi/package/davey.wasi.cjs \
       /tmp/davey-wasi/package/davey.wasm32-wasi.wasm \
       node_modules/@snazzah/davey/ && \
    rm -rf /tmp/davey-wasi.tgz /tmp/davey-wasi && \
    echo "DAVE WASI fallback installed for s390x"

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
