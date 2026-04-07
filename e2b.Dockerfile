FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Node.js 22 — required by create-vite@9 and @olonjs/cli
RUN apt-get update && \
    apt-get install -y curl git python3 bash && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify version
RUN node --version && npm --version

# Create user expected by E2B
RUN useradd -m -s /bin/bash user 2>/dev/null || true

# Install @olonjs/cli globally so `npx @olonjs/cli new tenant $name` is instant
RUN npm install -g @olonjs/cli

WORKDIR /home/user

RUN chown -R user:user /home/user

USER user