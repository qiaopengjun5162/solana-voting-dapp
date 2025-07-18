# ==============================================================================
# Professional Makefile for the "voting" Anchor Workspace Project
# ==============================================================================
# This file helps automate common tasks for your multi-program Solana project.
# It includes dynamic cluster selection, code quality checks, and versioning tools.

# --- Configuration ---

# Load environment variables from .env file.
# The `-` before `include` suppresses errors if the file doesn't exist.
-include .env
export

# Define the default cluster. Can be overridden from the command line.
# Example: make deploy CLUSTER=localnet
CLUSTER ?= devnet

# Define RPC URLs for different clusters.
# You can store your sensitive URLs in the .env file.
# Example .env file:
# DEVNET_RPC_URL="https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY"
# MAINNET_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY"
LOCALNET_RPC_URL := http://localhost:8899
DEVNET_RPC_URL ?= https://api.devnet.solana.com
MAINNET_RPC_URL ?= https://api.mainnet-beta.solana.com

# Select the RPC URL based on the CLUSTER variable.
ifeq ($(CLUSTER), localnet)
    RPC_URL := $(LOCALNET_RPC_URL)
else ifeq ($(CLUSTER), devnet)
    RPC_URL := $(DEVNET_RPC_URL)
else ifeq ($(CLUSTER), mainnet-beta)
    RPC_URL := $(MAINNET_RPC_URL)
else
    $(error Invalid CLUSTER specified. Use localnet, devnet, or mainnet-beta)
endif

# Default wallet path.
WALLET ?= ~/.config/solana/id.json

# Priority fee in micro-lamports.
COMPUTE_UNIT_PRICE ?= 100000

# --- Dynamic Program Discovery ---

# Automatically find all programs listed in Anchor.toml's workspace.
PROGRAMS := $(shell cat Anchor.toml | grep 'programs/' | sed 's/.*"programs\/\(.*\)"/\1/')

# --- Helper Variables ---
PROVIDER_ARGS := --provider.cluster $(RPC_URL) --provider.wallet $(WALLET)

# --- Main Commands ---

.PHONY: all build build-one clean test test-one deploy upgrade idl-init idl-upgrade size changelog lint fmt archive-idl help

all: build ## Build all programs in the workspace.

# --- Project Setup & Cleaning ---

clean: ## Clean build artifacts and reinstall dependencies.
	@echo "Cleaning project and reinstalling dependencies with pnpm..."
	@rm -rf target/
	@rm -rf node_modules/
	@rm -f yarn.lock pnpm-lock.yaml bun.lockb
	@pnpm install
	@echo "Done."

# --- Code Quality ---

fmt: ## Format all Rust code in the workspace.
	@echo "Formatting Rust code..."
	@cargo fmt --all

lint: fmt ## Run all linter checks (typos, clippy, etc.).
	@echo "Running linter checks..."
	@echo "Checking for typos..."
	@typos .
	@echo "Running clippy..."
	@cargo clippy --all -- -D warnings

# --- Build & Test ---

build: ## Build all programs in the workspace.
	@echo "Building all programs: $(PROGRAMS)..."
	@anchor build

build-one: ## Build a specific program. Usage: make build-one PROGRAM=<program_name>
	@if [ -z "$(PROGRAM)" ]; then \
		echo "Error: Usage: make build-one PROGRAM=<program_name>" >&2; \
		exit 1; \
	fi
	@echo "Building single program: [$(PROGRAM)]..."
	@anchor build --program-name $(PROGRAM)

test: ## Run all tests against the localnet.
	@echo "Running all tests for the workspace..."
	@anchor test --provider.cluster localnet

test-program: ## Test a specific program. Usage: make test-program PROGRAM=<program_name>
	@if [ -z "$(PROGRAM)" ]; then \
		echo "Error: Usage: make test-program PROGRAM=<program_name>" >&2; \
		exit 1; \
	fi
	@echo "Testing program [$(PROGRAM)]..."
	@anchor test --program-name $(PROGRAM)

# https://solana.com/fi/docs/toolkit/test-suite/code-coverage
coverage: ## Generate test coverage for all programs in the workspace.
	@echo "Generating test coverage for all programs..."
	@mucho coverage
	@echo "Coverage report generated. Open coverage/html/index.html to view."

size: build ## Check the size of all compiled program binaries.
	@echo "Checking program sizes..."
	@for program in $(PROGRAMS); do \
		echo "--- $$program ---"; \
		ls -lh target/deploy/$$program.so; \
	done

# --- Deployment & IDL Management ---

deploy: build ## Deploy a specific program. Usage: make deploy PROGRAM=<program_name> [CLUSTER=devnet]
	@if [ -z "$(PROGRAM)" ]; then \
		echo "Error: Usage: make deploy PROGRAM=<program_name>" >&2; \
		exit 1; \
	fi
	@echo "Deploying program [$(PROGRAM)] to cluster: $(CLUSTER)..."
	@anchor deploy --program-name $(PROGRAM) $(PROVIDER_ARGS) -- --with-compute-unit-price $(COMPUTE_UNIT_PRICE)

upgrade: build ## Upgrade a deployed program. Usage: make upgrade PROGRAM=<program_name> PROGRAM_ID=<program_id>
	@if [ -z "$(PROGRAM)" ] || [ -z "$(PROGRAM_ID)" ]; then \
		echo "Error: Usage: make upgrade PROGRAM=<program_name> PROGRAM_ID=<program_id>" >&2; \
		exit 1; \
	fi
	@echo "Upgrading program [$(PROGRAM)] with ID [$(PROGRAM_ID)] on cluster: $(CLUSTER)..."
	@anchor upgrade target/deploy/$(PROGRAM).so --program-id $(PROGRAM_ID) $(PROVIDER_ARGS) -- --with-compute-unit-price $(COMPUTE_UNIT_PRICE)

idl-init: ## Initialize the IDL account for a deployed program. Usage: make idl-init PROGRAM=<program_name> PROGRAM_ID=<program_id>
	@if [ -z "$(PROGRAM)" ] || [ -z "$(PROGRAM_ID)" ]; then \
		echo "Error: Usage: make idl-init PROGRAM=<program_name> PROGRAM_ID=<program_id>" >&2; \
		exit 1; \
	fi
	@echo "Initializing IDL for program [$(PROGRAM)] with ID [$(PROGRAM_ID)] on cluster: $(CLUSTER)..."
	@anchor idl init --filepath target/idl/$(PROGRAM).json $(PROGRAM_ID) $(PROVIDER_ARGS)

idl-upgrade: build ## Upgrade the IDL for a deployed program. Usage: make idl-upgrade PROGRAM=<program_name> PROGRAM_ID=<program_id>
	@if [ -z "$(PROGRAM)" ] || [ -z "$(PROGRAM_ID)" ]; then \
		echo "Error: Usage: make idl-upgrade PROGRAM=<program_name> PROGRAM_ID=<program_id>" >&2; \
		exit 1; \
	fi
	@echo "Upgrading IDL for program [$(PROGRAM)] with ID [$(PROGRAM_ID)] on cluster: $(CLUSTER)..."
	@anchor idl upgrade --filepath target/idl/$(PROGRAM).json $(PROGRAM_ID) $(PROVIDER_ARGS)

# --- Versioning & Archiving ---

changelog: ## Generate a changelog for a program. Usage: make changelog PROGRAM=<program_name>
	@if [ -z "$(PROGRAM)" ]; then \
		echo "Error: Usage: make changelog PROGRAM=<program_name>" >&2; \
		exit 1; \
	fi
	@echo "Generating changelog for [$(PROGRAM)]..."
	@git cliff --config cliff.toml --tag-pattern "$(PROGRAM)/v[0-9]*" -o programs/$(PROGRAM)/CHANGELOG.md
	@echo "Changelog generated at programs/$(PROGRAM)/CHANGELOG.md"

archive-idl: build ## Archive the current IDL for a program. Usage: make archive-idl PROGRAM=<program_name>
	@if [ -z "$(PROGRAM)" ]; then \
		echo "Error: Usage: make archive-idl PROGRAM=<program_name>" >&2; \
		exit 1; \
	fi
	@echo "Archiving IDL for [$(PROGRAM)]..."
	@mkdir -p idls/$(PROGRAM)
	@TIMESTAMP=$$(date +'%Y-%m-%d-%H%M%S'); \
	SOURCE_FILE="target/idl/$(PROGRAM).json"; \
	DEST_FILE="idls/$(PROGRAM)/$(PROGRAM)-$${TIMESTAMP}.json"; \
	cp "$${SOURCE_FILE}" "$${DEST_FILE}"; \
	echo "IDL for $(PROGRAM) successfully archived to $${DEST_FILE}"

# --- Help ---

help: ## Display this help screen.
	@echo "Usage: make <command> [OPTIONS]"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
