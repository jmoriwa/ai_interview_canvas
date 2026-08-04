.DEFAULT_GOAL := help

.PHONY: help setup run dev test

help: ## Show available commands
	@echo "Available commands:"
	@echo "  make setup  Install backend dependencies"
	@echo "  make run    Run the backend with auto-reload"
	@echo "  make test   Run the backend test suite"

setup: ## Install backend dependencies
	cd backend && uv sync

run: ## Run the backend development server
	cd backend && uv run uvicorn app.main:app --reload

dev: run ## Alias for make run

test: ## Run backend tests
	cd backend && uv run pytest -q

