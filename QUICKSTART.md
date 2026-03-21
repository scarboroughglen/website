# 🚀 Quick Start Guide

## Start the Application

```bash
make up
```

Or using docker compose directly:
```bash
docker compose up --build
```

Wait for the build to complete (first time takes ~2-3 minutes).

## Open in Browser

Visit: **http://localhost:3000**

## Create Your First Account

1. Click **"New Resident? Sign Up"**

2. Enter invite code: **SG-C1-101-2024**

3. Enter your email: **test@example.com**

4. Check the terminal/logs for your magic link:
   ```bash
   make logs
   # or
   docker compose logs -f
   ```

5. Look for a line like:
   ```
   Magic link for test@example.com: http://localhost:3000/api/auth/verify?token=abc123...
   ```

6. **Copy the entire URL** and paste it into your browser

7. You're logged in! 🎉

## Explore

- **Dashboard** - View your unit info and recent activity
- **Forums** - Access HOA and Condo 1 discussions
- **Documents** - View and download (watermarked) PDFs

## Create a Second User (Different Condo)

1. Open an incognito/private window
2. Sign up with: **SG-C2-201-2024**
3. Notice this user can access Condo 2 but NOT Condo 1

## Stop the Application

```bash
make down
# or
docker compose down
```

## Available Invite Codes

| Condo | Unit | Invite Code |
|-------|------|-------------|
| Condo 1 | 101 | SG-C1-101-2024 |
| Condo 1 | 102 | SG-C1-102-2024 |
| Condo 2 | 201 | SG-C2-201-2024 |
| Condo 2 | 202 | SG-C2-202-2024 |
| Condo 3 | 301 | SG-C3-301-2024 |
| Condo 4 | 401 | SG-C4-401-2024 |

(See [SETUP.md](SETUP.md) for all 16 codes)

## Troubleshooting

**Can't login?**
- Make sure you copied the FULL magic link URL
- Links expire after 15 minutes

**Database issues?**
```bash
make db-reset
# or
docker compose down -v
docker compose up --build
```

**See all available commands:**
```bash
make help
```

**Need help?**
See [SETUP.md](SETUP.md) for detailed documentation.
