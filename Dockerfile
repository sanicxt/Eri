# Eri Discord Music Bot — Docker image for IBM LinuxONE (s390x)
#
# Build · docker compose build
# Start · docker compose up -d
# Logs  · docker compose logs -f
#
# Build stages
# ───────────
# 1. rust-builder · installs Rust, clones Snazzah/davey, builds the
#   native .node binary for s390x target.
# 2. builder · npm installs the JS deps, copies the davey .node into
#   node_modules, removes opusscript (its WASM crashes on s390x).
# 3. runtime · small image with ffmpeg + libopus0.
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
# The WASI WASM fallback requires @napi-rs/wasm-runtime, wasi-worker.mjs,
# and davey.wasm32-wasi.wasm — and ultimately the WASM still segfaults
# on s390x memory layout. The only reliable fix is to compile the
# native .node binary for s390x from the upstream Rust source.
#
# @snazzah/davey is built with NAPI-RS. Building it natively on the
# s390x host (Docker build context) produces davey.linux-s390x-gnu.node
# which the loader picks up via its explicit s390x branch.

# ---- Rust builder: compile @snazzah/davey native .node for s390x ----
FROM node:20-slim AS rust-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates openssl build-essential pkg-config libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# Install Rust
ENV RUSTUP_HOME=/root/.rustup CARGO_HOME=/root/.cargo
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --default-toolchain stable --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

# Clone and build the davey repo. The davey-node subdirectory is a
# standard NAPI-RS package. `napi build --release` builds only for
# the host target (s390x in this case) — the package's own `build`
# script uses `--platform` to build for all targets, which we don't
# want because cross-compilation would fail without toolchains.
WORKDIR /tmp
RUN git clone --depth 1 https://github.com/Snazzah/davey.git
WORKDIR /tmp/davey/davey-node
RUN npm install --no-audit --no-fund       \
  && npx napi build --release             \
  && ls -la *.node

# ---- Main builder: npm install + copy davey native binary ----
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

# Copy the natively-compiled davey binary into the installed package.
# The NAPI-RS build emits 'davey.node' (not the platform-specific
# davey.linux-s390x-gnu.node that the @snazzah/davey loader expects);
# we rename it during the copy so the explicit s390x branch in
# index.js finds the right file.
COPY --from=rust-builder /tmp/davey/davey-node/davey.node \
                          node_modules/@snazzah/davey/davey.linux-s390x-gnu.node
RUN ls -la node_modules/@snazzah/davey/davey.linux-s390x-gnu.node && \
    echo "Native davey binary installed for s390x"

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
