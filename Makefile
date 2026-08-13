.DEFAULT_GOAL := help

.PHONY: help setup run dev test integration-test e2e-test frontend

help: ## Show available commands
	@echo "Available commands:"
	@echo "  make setup  Install backend dependencies"
	@echo "  make run    Run the backend with auto-reload"
	@echo "  make frontend  Run the frontend dev server"
	@echo "  make test   Run the backend test suite"
	@echo "  make integration-test  Run tests against docker-compose.yaml"
	@echo "  make e2e-test  Run Playwright end-to-end tests against docker-compose.yaml"

setup: ## Install backend dependencies
	cd backend && uv sync

run: ## Run the backend development server
	cd backend && uv run uvicorn app.main:app --reload

dev: run ## Alias for make run

frontend: ## Run the frontend development server
	cd frontend && npm run dev

test: ## Run backend tests
	cd backend && uv run pytest -q -m "not compose"

integration-test: ## Build docker-compose.yaml and run API/PostgreSQL integration tests
	cd backend && uv run pytest tests_integration -q -m compose --run-compose

e2e-test: ## Build docker-compose.yaml and run the browser collaboration flow
	cd e2e && npm test
