# Eri Discord Music Bot — Docker image for IBM LinuxONE (s390x)
#
# Build · docker compose build
# Start · docker compose up -d
# Logs  · docker compose logs -f
#
# Opus codec strategy for s390x
# ──────────────────────────────
# @discord-player/opus tries backends in this order:
#   • mediaplex      – no prebuilt binary for s390x (skipped)
#   • opusscript     – WASM binary crashes ("memory access out of bounds");
#                       physically removed from node_modules after npm install
#   • @evan/opus     – native tries first, then falls back to its own WASM
#
# DAVE protocol (discord-voip) for s390x
# ──────────────────────────────────────
# @snazzah/davey has an s390x branch in its loader but the
# @snazzah/davey-linux-s390x-gnu optional package was never published.
# The WASI WASM fallback requires @napi-rs/wasm-runtime (installed as
# a direct dep) and the WASM binary from @snazzah/davey-wasm32-wasi.
#
# We grab the WASI tarball from npm and extract all its files into
# node_modules/@snazzah/davey/. The loader's WASI fallback path
# picks up davey.wasi.cjs automatically.

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
# The @snazzah/davey loader checks ./davey.wasi.cjs when no native
# binary is found. We extract the full WASI package from npm into
# the davey directory. This works because the loader's WASI path
# loads davey.wasi.cjs which requires @napi-rs/wasm-runtime (a direct
# dep in our package.json) and wasi-worker.mjs (also in the package).
RUN DAVEY_WASI_VER=0.1.11 && \
    mkdir -p /tmp/davey-wasi && \
    curl -fsSL "https://registry.npmjs.org/@snazzah/davey-wasm32-wasi/-/davey-wasm32-wasi-${DAVEY_WASI_VER}.tgz" \
      -o /tmp/davey-wasi.tgz && \
    tar xzf /tmp/davey-wasi.tgz -C /tmp/davey-wasi && \
    cp /tmp/davey-wasi/package/*.cjs \
       /tmp/davey-wasi/package/*.js \
       /tmp/davey-wasi/package/*.mjs \
       /tmp/davey-wasi/package/*.wasm \
       node_modules/@snazzah/davey/ 2>/dev/null; true && \
    rm -rf /tmp/davey-wasi.tgz /tmp/davey-wasi && \
    ls node_modules/@snazzah/davey/davey.wasi.cjs && \
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
