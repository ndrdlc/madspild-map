# Madspild Map - Makefile
# Run 'make help' to see all available commands

.PHONY: help install dev build preview clean test lint format security audit deploy

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)Madspild Map - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	npm run dev

build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

preview: ## Preview production build
	@echo "$(BLUE)Starting preview server...$(NC)"
	npm run preview

clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf dist node_modules .vite
	@echo "$(GREEN)✓ Clean complete$(NC)"

##@ Code Quality

lint: ## Run ESLint
	@echo "$(BLUE)Running ESLint...$(NC)"
	npm run lint || true
	@echo "$(GREEN)✓ Linting complete$(NC)"

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format || true
	@echo "$(GREEN)✓ Formatting complete$(NC)"

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	npm run format:check || true

##@ Security

security: audit check-deps check-env ## Run all security checks
	@echo "$(GREEN)✓ All security checks complete$(NC)"

audit: ## Run npm audit
	@echo "$(BLUE)Running npm audit...$(NC)"
	npm audit --production || echo "$(YELLOW)⚠ Some vulnerabilities found$(NC)"

check-deps: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(NC)"
	npm outdated || true

check-env: ## Check if .env.local exists
	@echo "$(BLUE)Checking environment configuration...$(NC)"
	@if [ ! -f .env.local ]; then \
		echo "$(RED)✗ .env.local not found$(NC)"; \
		echo "$(YELLOW)→ Copy .env.example to .env.local and add your API key$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ .env.local found$(NC)"; \
	fi
	@if grep -q "your_salling_group_api_key" .env.local 2>/dev/null; then \
		echo "$(RED)✗ API key not configured (still using placeholder)$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ API key configured$(NC)"; \
	fi

check-secrets: ## Check for accidentally committed secrets
	@echo "$(BLUE)Checking for committed secrets...$(NC)"
	@if git rev-parse --git-dir > /dev/null 2>&1; then \
		if git ls-files | xargs grep -l "VITE_SALLING_API_KEY.*=.*[a-zA-Z0-9]" | grep -v ".env.example" | grep -v "Makefile" | grep -v "README.md" | grep -v "DEPLOYMENT"; then \
			echo "$(RED)✗ Potential API key found in tracked files!$(NC)"; \
			exit 1; \
		else \
			echo "$(GREEN)✓ No secrets found in tracked files$(NC)"; \
		fi \
	else \
		echo "$(YELLOW)⚠ Not a git repository, skipping check$(NC)"; \
	fi

##@ Testing

test: ## Run tests (placeholder - add tests later)
	@echo "$(YELLOW)⚠ No tests configured yet$(NC)"
	@echo "$(BLUE)To add tests, consider installing: vitest$(NC)"

##@ Git & Deployment

git-status: ## Show git status and check for uncommitted changes
	@echo "$(BLUE)Git Status:$(NC)"
	@git status --short

pre-commit: lint format-check security ## Run pre-commit checks
	@echo "$(GREEN)✓ All pre-commit checks passed$(NC)"

deploy-check: build security check-secrets ## Check if ready to deploy
	@echo "$(BLUE)Checking deployment readiness...$(NC)"
	@if [ ! -f dist/index.html ]; then \
		echo "$(RED)✗ Build failed - dist/index.html not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Ready to deploy!$(NC)"
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  1. Push to GitHub: git push origin main"
	@echo "  2. Deploy on Vercel: https://vercel.com"
	@echo "  3. Add environment variable: VITE_SALLING_API_KEY"

##@ Maintenance

update: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(NC)"
	npm update
	@echo "$(GREEN)✓ Dependencies updated$(NC)"

update-check: ## Check for available updates
	@echo "$(BLUE)Checking for available updates...$(NC)"
	npm outdated

setup: install check-env ## Complete setup for new developers
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo "$(BLUE)Run 'make dev' to start developing$(NC)"

##@ Docker (Optional)

docker-build: ## Build Docker image (if Dockerfile exists)
	@if [ -f Dockerfile ]; then \
		docker build -t madspild-map .; \
	else \
		echo "$(RED)✗ Dockerfile not found$(NC)"; \
	fi

docker-run: ## Run Docker container
	@docker run -p 3000:3000 madspild-map

##@ Information

info: ## Show project information
	@echo "$(BLUE)Project Information:$(NC)"
	@echo "Name:        Madspild Map"
	@echo "Version:     $$(cat package.json | grep version | head -1 | awk -F: '{ print $$2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')"
	@echo "Node:        $$(node --version)"
	@echo "npm:         $$(npm --version)"
	@if [ -f .env.local ]; then \
		echo "Env file:    $(GREEN)✓ Configured$(NC)"; \
	else \
		echo "Env file:    $(RED)✗ Not configured$(NC)"; \
	fi

show-env: ## Show environment variables (without values)
	@echo "$(BLUE)Environment Variables:$(NC)"
	@if [ -f .env.local ]; then \
		cat .env.local | grep -v "^#" | grep -v "^$$" | cut -d= -f1; \
	else \
		echo "$(RED).env.local not found$(NC)"; \
	fi