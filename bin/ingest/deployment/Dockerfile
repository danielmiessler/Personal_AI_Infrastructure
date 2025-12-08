# Context Skill Clean Room Environment
# Purpose: Validate deployment on a fresh machine without host contamination
#
# Usage:
#   docker build -t pai-context-cleanroom .
#   docker run --rm -it pai-context-cleanroom ./validate.sh
#
# With Claude Code (for acceptance tests):
#   docker run --rm -it \
#     -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
#     pai-context-cleanroom ./validate.sh --with-claude

FROM debian:bookworm-slim

LABEL maintainer="mellanon"
LABEL description="PAI Context Skill Clean Room Environment"

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    ca-certificates \
    # For PDF extraction (marker-pdf optional)
    python3 \
    python3-pip \
    python3-venv \
    # For OCR (tesseract optional)
    tesseract-ocr \
    # For audio transcription dependencies
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install Node.js (needed for some npm packages and Claude Code)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI (Anthropic's Claude CLI)
# This allows running acceptance tests with real Claude
RUN npm install -g @anthropic-ai/claude-code

# Create working directories
WORKDIR /pai
RUN mkdir -p /pai/vault /pai/config /pai/cache

# Set up minimal environment
ENV HOME=/root
ENV OBSIDIAN_VAULT_PATH=/pai/vault
ENV PAI_DIR=/pai/repo

# Copy test vault fixture (minimal set of test notes)
COPY test-vault/ /pai/vault/

# The repo will be mounted at runtime for development
# Or copied in for CI builds
VOLUME ["/pai/repo"]

# Copy validation and runner scripts
COPY validate.sh /pai/validate.sh
COPY run-tests.sh /pai/run-tests.sh
COPY entrypoint.sh /pai/entrypoint.sh
RUN chmod +x /pai/*.sh

# Default: run validation
ENTRYPOINT ["/pai/entrypoint.sh"]
CMD ["validate"]

