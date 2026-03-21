.PHONY: help build build-prod push-prod deploy-prod up run down start stop restart logs shell db-reset db-studio db-studio-stop clean dev prod verify codes make-admin revoke-admin list-admins

# Google Cloud settings (override with: make build-prod REGION=us-central1 PROJECT_ID=my-project)
REGION     ?= us-central1
PROJECT_ID ?= $(shell gcloud config get-value project 2>/dev/null || echo "my-project")

# Default target
help:
	@echo "🏘️  Scarborough Glen HOA Portal - Make Commands"
	@echo ""
	@echo "Common Commands:"
	@echo "  make build       - Build the Docker container (local dev)"
	@echo "  make build-prod  - Build and tag for Google Artifact Registry"
	@echo "  make push-prod   - Build and push to Artifact Registry (requires gcloud auth)"
	@echo "  make deploy-prod - Deploy pushed image to Cloud Run"
	@echo "  make up          - Start in background (detached)"
	@echo "  make run         - Start with live logs (foreground)"
	@echo "  make down        - Stop and remove containers"
	@echo "  make start       - Start existing containers"
	@echo "  make stop        - Stop containers (without removing)"
	@echo "  make restart     - Restart the application"
	@echo "  make logs        - View application logs (follow mode)"
	@echo ""
	@echo "Development:"
	@echo "  make dev         - Run in development mode with hot-reload"
	@echo "  make prod        - Run in production mode"
	@echo ""
	@echo "Database:"
	@echo "  make db-reset       - Reset database (destroys all data)"
	@echo "  make db-studio      - Open Prisma Studio to view database"
	@echo "  make db-studio-stop - Stop Prisma Studio"
	@echo "  make db-seed        - Re-seed the database"
	@echo "  make codes          - Show all invite codes and their status"
	@echo ""
	@echo "MinIO / S3 Storage:"
	@echo "  make minio-console - Open MinIO web console"
	@echo "  make minio-buckets - List all S3 buckets"
	@echo ""
	@echo "Utilities:"
	@echo "  make shell       - Open shell in the container"
	@echo "  make clean       - Remove all containers, volumes, and images"
	@echo "  make verify      - Verify build files are present"
	@echo "  make status      - Show container status"
	@echo ""
	@echo "Testing:"
	@echo "  make test        - Run automated test suite"
	@echo ""
	@echo "Admin:"
	@echo "  make make-admin EMAIL=user@example.com  - Grant admin access to a user"
	@echo "  make revoke-admin EMAIL=user@example.com - Revoke admin access"
	@echo "  make list-admins                        - List all admin users"
	@echo ""
	@echo "Documentation:"
	@echo "  See ADMIN_GUIDE.md for admin user management"
	@echo "  See WATERMARKING.md for leak tracing & forensic watermarking"
	@echo "  See GCP_DEPLOYMENT.md for production deployment guide"
	@echo "  See DESCRIPTION_EXTRACTION.md for document description features"
	@echo ""

# Build the Docker container (local dev)
build:
	@echo "🔨 Building Docker container..."
	docker compose build

# Build and tag for Google Artifact Registry
build-prod:
	@echo "🔨 Building production image for Cloud Run..."
	@echo "   Region:  $(REGION)"
	@echo "   Project: $(PROJECT_ID)"
	REGION=$(REGION) PROJECT_ID=$(PROJECT_ID) docker compose build
	@echo "✅ Image tagged: $(REGION)-docker.pkg.dev/$(PROJECT_ID)/hoa-portal/hoa-portal:latest"

# Push production image to Artifact Registry
push-prod: build-prod
	@echo "📤 Pushing image to Artifact Registry..."
	docker push $(REGION)-docker.pkg.dev/$(PROJECT_ID)/hoa-portal/hoa-portal:latest
	@echo "✅ Push complete"

# Deploy to Cloud Run
deploy-prod:
	@echo "🚀 Deploying to Cloud Run..."
	@echo "   Region:  $(REGION)"
	@echo "   Project: $(PROJECT_ID)"
	gcloud run deploy hoa-portal \
		--image=$(REGION)-docker.pkg.dev/$(PROJECT_ID)/hoa-portal/hoa-portal:latest \
		--region=$(REGION) \
		--platform=managed \
		--allow-unauthenticated \
		--memory=512Mi \
		--cpu=1 \
		--min-instances=1 \
		--max-instances=1 \
		--timeout=300 \
		--set-env-vars="NODE_ENV=production" \
		--set-env-vars="STORAGE_PROVIDER=gcp" \
		--set-env-vars="S3_ENDPOINT=storage.googleapis.com" \
		--set-env-vars="S3_PORT=443" \
		--set-env-vars="S3_USE_SSL=true" \
		--set-env-vars="S3_REGION=$(REGION)" \
		--set-secrets="DATABASE_URL=database-url:latest" \
		--set-secrets="S3_ACCESS_KEY=s3-access-key:latest" \
		--set-secrets="S3_SECRET_KEY=s3-secret-key:latest" \
		--set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
		--add-volume=name=database,type=cloud-storage,bucket=$(PROJECT_ID)-database \
		--add-volume-mount=volume=database,mount-path=/app/data
	@echo "✅ Deployment complete"

# Start in background (detached mode)
up:
	@echo "🚀 Starting in background..."
	docker compose up -d
	@echo "✅ Running at http://localhost:3000"
	@echo "💡 Use 'make logs' to view logs"

# Start with live logs (foreground mode)
run:
	@echo "🚀 Starting Scarborough Glen HOA Portal..."
	@echo "📍 URL: http://localhost:3000"
	docker compose up

# Stop and remove containers
down:
	@echo "🛑 Stopping application..."
	docker compose down

# Start existing containers
start:
	@echo "▶️  Starting containers..."
	docker compose start

# Stop containers without removing
stop:
	@echo "⏸️  Stopping containers..."
	docker compose stop

# Restart the application
restart: stop start
	@echo "🔄 Application restarted"

# View logs (follow mode)
logs:
	@echo "📋 Viewing logs (Ctrl+C to exit)..."
	docker compose logs -f

# View logs (last 100 lines)
logs-tail:
	docker compose logs --tail=100

# Development mode with hot-reload
dev:
	@echo "🔧 Starting in development mode..."
	@echo "📍 URL: http://localhost:3000"
	docker compose -f docker-compose.dev.yml up

# Production mode
prod: up

# Open shell in the container
shell:
	@echo "🐚 Opening shell in container..."
	docker compose exec app sh

# Reset database (WARNING: destroys all data)
db-reset:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🗑️  Resetting database..."
	docker compose down -v
	docker compose up -d
	@echo "✅ Database reset complete"

# Open Prisma Studio
db-studio:
	@echo "📊 Starting Prisma Studio..."
	@echo ""
	@echo "Checking if app container is running..."
	@if ! docker compose ps app | grep -q "Up"; then \
		echo "❌ Error: App container is not running"; \
		echo ""; \
		echo "Please start the application first:"; \
		echo "  make up"; \
		echo ""; \
		exit 1; \
	fi
	@echo "✅ App container is running"
	@echo ""
	@echo "Checking if port 5555 is mapped..."
	@if ! docker compose port app 5555 2>/dev/null | grep -q "5555"; then \
		echo "❌ Error: Port 5555 is not exposed"; \
		echo ""; \
		echo "Restarting containers with port mapping..."; \
		docker compose up -d; \
		sleep 2; \
	fi
	@echo "✅ Port 5555 is mapped"
	@echo ""
	@echo "Starting Prisma Studio (this may take a few seconds)..."
	@docker compose exec -d app npx prisma studio
	@echo ""
	@echo "Waiting for Prisma Studio to start..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -s http://localhost:5555 > /dev/null 2>&1; then \
			echo "✅ Prisma Studio is ready!"; \
			echo ""; \
			echo "📍 URL: http://localhost:5555"; \
			echo ""; \
			echo "💡 Press Ctrl+C in this terminal to keep it running"; \
			echo "   Or use 'make db-studio-stop' to stop it"; \
			echo ""; \
			exit 0; \
		fi; \
		echo "   Attempt $$i/10..."; \
		sleep 1; \
	done; \
	echo ""; \
	echo "❌ Error: Prisma Studio did not start within 10 seconds"; \
	echo ""; \
	echo "Troubleshooting:"; \
	echo "  1. Check container logs: docker compose logs app"; \
	echo "  2. Try restarting: make restart"; \
	echo "  3. Check if port 5555 is in use: lsof -i :5555"; \
	echo ""; \
	exit 1

# Stop Prisma Studio
db-studio-stop:
	@echo "🛑 Stopping Prisma Studio..."
	@docker compose exec app pkill -f "prisma studio" 2>/dev/null || echo "Prisma Studio was not running"
	@echo "✅ Stopped"

# Re-seed the database
db-seed:
	@echo "🌱 Seeding database..."
	docker compose exec app npx prisma db seed

# Run database migrations
db-migrate:
	@echo "🔄 Running database migrations..."
	docker compose exec app npx prisma migrate deploy

# Clean everything (containers, volumes, images)
clean:
	@echo "🧹 Cleaning up all Docker resources..."
	docker compose down -v --remove-orphans
	@echo "✅ Cleanup complete"

# Deep clean (including images)
clean-all: clean
	@echo "🧹 Removing Docker images..."
	docker compose down -v --rmi all --remove-orphans
	@echo "✅ Deep cleanup complete"

# Verify build
verify:
	@echo "🔍 Verifying build..."
	@./verify-build.sh

# Show container status
status:
	@echo "📊 Container Status:"
	@docker compose ps

# Quick start (build, start in background, show logs)
quickstart: up
	@sleep 2
	@make logs

# View invite codes from database
codes:
	@docker compose exec -T app npx tsx scripts/show-codes.ts

# Open MinIO Console
minio-console:
	@echo "🪣 Opening MinIO Console..."
	@echo "📍 URL: http://localhost:9001"
	@echo "👤 User: minioadmin"
	@echo "🔑 Pass: minioadmin"
	@open http://localhost:9001 2>/dev/null || xdg-open http://localhost:9001 2>/dev/null || echo "Open http://localhost:9001 in your browser"

# List MinIO buckets
minio-buckets:
	@echo "🪣 MinIO Buckets:"
	@docker compose exec minio-init mc ls local 2>/dev/null || echo "Run 'make up' first"

# Install dependencies (inside container)
install:
	docker compose exec app npm install

# Format code (when prettier is configured)
format:
	docker compose exec app npm run format || echo "No format script configured"

# Lint code
lint:
	docker compose exec app npm run lint

# Run automated end-to-end tests
test:
	@echo "🧪 Running automated test suite..."
	@bash ./tests/test-suite.sh

# Run tests and generate report
test-report:
	@echo "🧪 Running tests with detailed report..."
	@bash ./tests/test-suite.sh | tee test-results/test-run-$$(date +%Y%m%d-%H%M%S).log

# Run unit tests (when implemented)
test-unit:
	docker compose exec app npm test || echo "No unit tests configured"

# Make a user an admin
make-admin:
	@if [ -z "$(EMAIL)" ]; then \
		echo "❌ Error: EMAIL parameter required"; \
		echo ""; \
		echo "Usage: make make-admin EMAIL=user@example.com"; \
		echo ""; \
		exit 1; \
	fi
	@docker compose exec app npx tsx scripts/make-admin.ts "$(EMAIL)"

# Revoke admin access from a user
revoke-admin:
	@if [ -z "$(EMAIL)" ]; then \
		echo "❌ Error: EMAIL parameter required"; \
		echo ""; \
		echo "Usage: make revoke-admin EMAIL=user@example.com"; \
		echo ""; \
		exit 1; \
	fi
	@docker compose exec app npx tsx scripts/revoke-admin.ts "$(EMAIL)"

# List all admin users
list-admins:
	@echo "👤 Admin Users:"
	@echo ""
	@docker compose exec -T app npx prisma db execute --stdin <<< "SELECT email, isAdmin FROM User WHERE isAdmin = 1;" 2>/dev/null | tail -n +2 || echo "  No admins found"
	@echo ""
