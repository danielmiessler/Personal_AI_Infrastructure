# PAI Context Skill - Docker Development Makefile
#
# TWO MODES:
#
# 1. DEVELOPMENT MODE (default) - Test your current working code
#    make build / make test / make shell
#    Uses: Your mounted working directory
#
# 2. CLEAN ROOM MODE - Simulate new user installing from upstream + your contribution
#    make cleanroom-build / make cleanroom-test
#    Uses: Fresh clone of upstream + your vanilla-skill branch
#
# ═══════════════════════════════════════════════════════════════════════════
# CLEAN ROOM MODE (Contribution Testing)
# ═══════════════════════════════════════════════════════════════════════════
#
# This simulates: New user clones upstream PAI + applies your skill PR
#
#   make cleanroom-build SKILL_BRANCH=feature/vanilla-context-skill
#   make cleanroom-test
#
# Configure via environment or arguments:
#   UPSTREAM_REPO  - Default: danielmiessler/Personal_AI_Infrastructure
#   SKILL_REPO     - Default: mellanon/pai-1.2 (your fork)
#   SKILL_BRANCH   - Default: feature/vanilla-context-skill
#
# ═══════════════════════════════════════════════════════════════════════════

.PHONY: build validate test test-unit test-integration test-cli test-acceptance ci shell clean clean-volumes help
.PHONY: cleanroom-build cleanroom-test cleanroom-shell
.PHONY: release-deploy release-tag release-check

# Default target
.DEFAULT_GOAL := help

# Image names
IMAGE_NAME := pai-context-dev
CLEANROOM_IMAGE := pai-context-cleanroom

# Volume names (for development mode persistence)
VOL_BUN_CACHE := pai-context-bun-cache
VOL_NODE_OBS := pai-context-node-modules-obs
VOL_NODE_INGEST := pai-context-node-modules-ingest
VOL_TEST_OUTPUT := pai-context-test-output

# Clean room configuration (override via environment or command line)
UPSTREAM_REPO ?= danielmiessler/Personal_AI_Infrastructure
SKILL_REPO ?= mellanon/pai-1.2
SKILL_BRANCH ?= feature/vanilla-context-skill

# ═══════════════════════════════════════════════════════════════════════════
# Build (Development Mode)
# ═══════════════════════════════════════════════════════════════════════════

build: ## Build development image (uses your working directory)
	docker build -t $(IMAGE_NAME) .

build-no-cache: ## Build without cache (fresh build)
	docker build --no-cache -t $(IMAGE_NAME) .

# ═══════════════════════════════════════════════════════════════════════════
# Clean Room Mode (Contribution Testing)
# ═══════════════════════════════════════════════════════════════════════════

cleanroom-build: ## Build clean room image (upstream + your skill branch)
	@echo "═══════════════════════════════════════════════════════════════════"
	@echo "  Building Clean Room"
	@echo "  Upstream: $(UPSTREAM_REPO)"
	@echo "  Skill:    $(SKILL_REPO)@$(SKILL_BRANCH)"
	@echo "═══════════════════════════════════════════════════════════════════"
	docker build -f Dockerfile.cleanroom \
		--build-arg UPSTREAM_REPO=$(UPSTREAM_REPO) \
		--build-arg SKILL_REPO=$(SKILL_REPO) \
		--build-arg SKILL_BRANCH=$(SKILL_BRANCH) \
		-t $(CLEANROOM_IMAGE) .

cleanroom-test: ## Run clean room validation (simulates new user)
	docker run --rm $(CLEANROOM_IMAGE)

cleanroom-shell: ## Interactive shell in clean room
	docker run --rm -it $(CLEANROOM_IMAGE) /bin/bash

cleanroom-full: cleanroom-build cleanroom-test ## Build and test clean room

# ═══════════════════════════════════════════════════════════════════════════
# Setup (first run)
# ═══════════════════════════════════════════════════════════════════════════

install: build ## Install dependencies into persistent volumes (run once)
	@echo "📦 Installing dependencies into persistent volumes..."
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		$(IMAGE_NAME) /bin/bash -c "\
			cd /pai/repo/bin/obs && bun install && \
			cd /pai/repo/bin/ingest && bun install && \
			echo '✅ Dependencies installed to persistent volumes'"

setup: build install validate ## First-time setup: build, install deps, validate
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════════"
	@echo "  ✅ Setup complete! You can now run:"
	@echo "     make test-unit    - Run unit tests"
	@echo "     make test         - Run all tests"
	@echo "     make shell        - Interactive shell"
	@echo "═══════════════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════════════════
# Validation
# ═══════════════════════════════════════════════════════════════════════════

validate: build ## Run deployment validation (smoke test)
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault:ro" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		$(IMAGE_NAME) validate

validate-with-claude: build ## Validate including Claude CLI check
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault:ro" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		-e ANTHROPIC_API_KEY=$(ANTHROPIC_API_KEY) \
		$(IMAGE_NAME) validate --with-claude

# ═══════════════════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════════════════

test: build ## Run all tests
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		-e OPENAI_API_KEY=$(OPENAI_API_KEY) \
		$(IMAGE_NAME) test all

test-unit: build ## Run unit tests only
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		$(IMAGE_NAME) test unit

test-integration: build ## Run integration tests
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		-e OPENAI_API_KEY=$(OPENAI_API_KEY) \
		-e TELEGRAM_BOT_TOKEN=$(TELEGRAM_BOT_TOKEN) \
		-e TELEGRAM_CHANNEL_ID=$(TELEGRAM_CHANNEL_ID) \
		$(IMAGE_NAME) test integration

test-cli: build ## Run CLI tests only
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		$(IMAGE_NAME) test cli

test-acceptance: build ## Run acceptance tests (requires ANTHROPIC_API_KEY)
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		-e ANTHROPIC_API_KEY=$(ANTHROPIC_API_KEY) \
		$(IMAGE_NAME) test acceptance

# ═══════════════════════════════════════════════════════════════════════════
# CI/CD
# ═══════════════════════════════════════════════════════════════════════════

ci: build ## Run CI-safe tests (no live APIs required)
	docker run --rm \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault:ro" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		$(IMAGE_NAME) ci

# ═══════════════════════════════════════════════════════════════════════════
# Development
# ═══════════════════════════════════════════════════════════════════════════

shell: build ## Interactive shell in clean room (persistent)
	docker run --rm -it \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		-e OPENAI_API_KEY=$(OPENAI_API_KEY) \
		-e ANTHROPIC_API_KEY=$(ANTHROPIC_API_KEY) \
		$(IMAGE_NAME) shell

# Run with your full .env file
shell-full: build ## Shell with your local .env (persistent)
	docker run --rm -it \
		-v "$$(cd ../../.. && pwd):/pai/repo" \
		-v "$$(pwd)/test-vault:/pai/vault" \
		-v "$$HOME/.config/fabric/.env:/pai/config/.env:ro" \
		-v $(VOL_BUN_CACHE):/root/.bun/install/cache \
		-v $(VOL_NODE_OBS):/pai/repo/bin/obs/node_modules \
		-v $(VOL_NODE_INGEST):/pai/repo/bin/ingest/node_modules \
		-v $(VOL_TEST_OUTPUT):/pai/repo/bin/ingest/test/output \
		-e OBSIDIAN_VAULT_PATH=/pai/vault \
		-e PAI_DIR=/pai/repo \
		$(IMAGE_NAME) shell

# ═══════════════════════════════════════════════════════════════════════════
# Utilities
# ═══════════════════════════════════════════════════════════════════════════

clean: ## Remove Docker image (keeps persistent volumes)
	docker rmi $(IMAGE_NAME) 2>/dev/null || true
	docker builder prune -f

clean-volumes: ## Remove all persistent volumes (full reset)
	docker volume rm $(VOL_BUN_CACHE) 2>/dev/null || true
	docker volume rm $(VOL_NODE_OBS) 2>/dev/null || true
	docker volume rm $(VOL_NODE_INGEST) 2>/dev/null || true
	docker volume rm $(VOL_TEST_OUTPUT) 2>/dev/null || true
	@echo "✅ All persistent volumes removed"

clean-all: clean clean-volumes ## Full cleanup (image + volumes)

clean-cleanroom: ## Remove clean room image
	docker rmi $(CLEANROOM_IMAGE) 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════════════════
# Release Management
# ═══════════════════════════════════════════════════════════════════════════

release-check: ## Check for personal data before release
	@echo "🔍 Checking for personal data..."
	@./scripts/deploy-to-release.sh --dry-run

release-deploy: ## Deploy to release branch (interactive)
	@./scripts/deploy-to-release.sh

release-tag: ## Create version tag (usage: make release-tag VERSION=1.0.0)
ifndef VERSION
	$(error VERSION is required. Usage: make release-tag VERSION=1.0.0)
endif
	@./scripts/deploy-to-release.sh --version $(VERSION)

logs: ## Show Docker build logs
	docker build -t $(IMAGE_NAME) . 2>&1 | tee build.log

# ═══════════════════════════════════════════════════════════════════════════
# Help
# ═══════════════════════════════════════════════════════════════════════════

volumes: ## Show persistent volume status
	@echo "Persistent Volumes:"
	@docker volume ls --filter name=pai-context --format "  {{.Name}}: {{.Driver}}"
	@echo ""
	@echo "To reset: make clean-volumes"

help: ## Show this help
	@echo "PAI Context Skill - Docker Development"
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════════"
	@echo "  TWO MODES:"
	@echo ""
	@echo "  1. DEVELOPMENT - Test your current working code"
	@echo "     make build / make test / make shell"
	@echo ""
	@echo "  2. CLEAN ROOM - Simulate new user (upstream + your skill PR)"
	@echo "     make cleanroom-build SKILL_BRANCH=feature/vanilla-context-skill"
	@echo "     make cleanroom-test"
	@echo "═══════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Clean Room Configuration:"
	@echo "  UPSTREAM_REPO=$(UPSTREAM_REPO)"
	@echo "  SKILL_REPO=$(SKILL_REPO)"
	@echo "  SKILL_BRANCH=$(SKILL_BRANCH)"
	@echo ""
	@echo "Environment Variables:"
	@echo "  OPENAI_API_KEY       - For semantic search tests"
	@echo "  ANTHROPIC_API_KEY    - For acceptance tests with Claude"
	@echo "  TELEGRAM_BOT_TOKEN   - For Telegram integration tests"

