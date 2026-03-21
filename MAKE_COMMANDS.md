# Make Commands Reference

Quick reference for all available make commands.

## 🚀 Getting Started

```bash
make up          # Start the application (foreground)
make logs        # View logs
make down        # Stop the application
```

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make build` | Build the Docker container |
| `make up` | Build and start (foreground) |
| `make up-detached` | Build and start (background) |
| `make down` | Stop and remove containers |
| `make start` | Start existing containers |
| `make stop` | Stop containers (keep them) |
| `make restart` | Restart the application |
| `make logs` | View logs (follow mode) |
| `make logs-tail` | View last 100 lines |
| `make status` | Show container status |

## 🔧 Development

| Command | Description |
|---------|-------------|
| `make dev` | Run in development mode with hot-reload |
| `make prod` | Run in production mode |
| `make shell` | Open shell inside container |
| `make lint` | Run code linter |
| `make verify` | Verify build files |

## 💾 Database

| Command | Description |
|---------|-------------|
| `make db-reset` | Reset database (⚠️ destroys all data) |
| `make db-studio` | Open Prisma Studio (view database) |
| `make db-seed` | Re-seed the database |
| `make db-migrate` | Run database migrations |

## 🧹 Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Remove containers and volumes |
| `make clean-all` | Remove everything including images |

## 🎯 Quick Workflows

### First Time Setup
```bash
make up          # Start the app
# In another terminal:
make logs        # Watch for magic links
```

### Daily Development
```bash
make dev         # Start with hot-reload
# Make your changes
make restart     # Restart if needed
```

### View Database
```bash
make db-studio   # Opens Prisma Studio
```

### Fresh Start
```bash
make db-reset    # Reset everything
```

### Deploy/Production
```bash
make prod        # Run in production mode
```

## 🎟️ Useful Info

### View Invite Codes
```bash
make codes
```

### Check Container Status
```bash
make status
```

### Access Container Shell
```bash
make shell
```

## 💡 Tips

- Use `make` or `make help` to see all commands
- Most commands have docker compose equivalents if you prefer
- `make logs` is great for finding magic links during testing
- `make dev` enables hot-reload for development
- `make db-studio` is perfect for viewing/editing database records

## 🆘 Troubleshooting

**Container won't start?**
```bash
make clean
make up
```

**Database corrupted?**
```bash
make db-reset
```

**Need to see what's running?**
```bash
make status
```

**Want to poke around inside?**
```bash
make shell
```
