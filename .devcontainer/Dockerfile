FROM mcr.microsoft.com/devcontainers/base:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
  && rm -rf /var/lib/apt/lists/*

# Node 20.x (change 20 to 18/22 if desired)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code
