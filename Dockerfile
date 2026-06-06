# Eri Discord Music Bot — Docker image for IBM LinuxONE (s390x)
#
# Build · docker compose build
# Start · docker compose up -d
# Logs  · docker compose logs -f
#
# Native modules (mediaplex, @discord-player/opus, @snazzah/davey) ship
# prebuilt binaries for x86_64/aarch64 but not for s390x.  The builder
# stage installs g++/python3/make so node-gyp can compile them from
# source.  If a module's source doesn't build on s390x, remove it from
# package.json and rebuild.

FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++             \
    ffmpeg                       \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /eri

# Single COPY + install — npm needs all project files to resolve the
# dependency tree correctly when there's no lockfile (the project uses
# bun.lock, not package-lock.json).
COPY . .
RUN npm install --omit=dev     \
  && rm -rf node_modules/.cache

# ---- runtime ----
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg                       \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r eri && useradd -r -g eri eri

WORKDIR /eri
COPY --chown=eri:eri --from=builder /eri ./

USER eri
CMD ["node", "eri.js"]
