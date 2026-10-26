# Cursor Cloud Agent base image for directory-template.
# Mirrors nixpacks.toml: Node 22, pnpm, Chromium + Playwright system deps.
# Do not COPY the project — Cursor checks out the repo at runtime.

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    make \
    g++ \
    build-essential \
    chromium-browser \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 (matches nixpacks NODE_VERSION=22.20)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# pnpm version pinned in package.json packageManager field
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_OPTIONS="--max-old-space-size=4096 --experimental-require-module"

WORKDIR /workspace
