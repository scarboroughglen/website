# Scarborough Glen HOA Portal

A secure, invite-only homeowners association portal built with Next.js, SQLite, and Docker.

## Features

- 🔐 **Passwordless Authentication** - Magic link login (no passwords!)
- 🎟️ **Invite-Only Access** - Unique codes for each unit
- 💬 **Private Forums** - HOA-wide and condo-specific discussions
- 📁 **Secure Documents** - PDF downloads with automatic watermarking
- 🤖 **AI-Powered Descriptions** - OpenAI/Gemini generates smart document descriptions
- 📂 **Google Drive Staging** (Optional) - Admins upload to Drive, auto-sync to S3
- 🏘️ **Multi-Section Access** - Users access HOA + their condo section
- 🐳 **Dockerized** - No local dependencies needed

## Quick Start

### 1. Build and Run

```bash
make up
# or
docker compose up --build
```

### 2. Access the Application

Open http://localhost:3000 in your browser

### 3. Sign Up with Invite Code

Use one of the pre-seeded invite codes:
- **Condo 1**: `SG-C1-101-2024` through `SG-C1-104-2024`
- **Condo 2**: `SG-C2-201-2024` through `SG-C2-204-2024`
- **Condo 3**: `SG-C3-301-2024` through `SG-C3-304-2024`
- **Condo 4**: `SG-C4-401-2024` through `SG-C4-404-2024`

### 4. Get Your Magic Link

Since email isn't configured yet, check the Docker logs for your magic link:

```bash
docker compose logs -f
```

Look for:
```
Magic link for your@email.com: http://localhost:3000/api/auth/verify?token=...
```

Copy the URL and paste it in your browser to login!

## Architecture

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: Custom magic link system
- **PDF Processing**: pdf-lib for watermarking
- **Containerization**: Docker + Docker Compose

## Project Structure

```
.
├── app/                  # Next.js application
│   ├── api/             # API routes
│   ├── dashboard/       # User dashboard
│   ├── forum/           # Discussion forums
│   ├── documents/       # Document library
│   ├── login/           # Login page
│   └── invite/          # Signup page
├── lib/                 # Utilities
├── prisma/              # Database schema & migrations
├── data/                # Persistent storage (DB + uploads)
├── Dockerfile           # Container configuration
└── docker-compose.yml   # Docker orchestration
```

## Development

### Development Mode with Hot Reload

```bash
docker compose -f docker-compose.dev.yml up
```

### Database Commands

```bash
# View database with Prisma Studio
docker compose exec app npx prisma studio
# or
make db-studio

# View all invite codes and their status
make codes

# Reset database
docker compose exec app npx prisma migrate reset
# or
make db-reset

# Create new migration
docker compose exec app npx prisma migrate dev --name your_migration_name
```

### Watermarking & Leak Tracing

```bash
# Extract watermark from a downloaded PDF
docker compose exec app npx tsx scripts/extract-watermark.ts /path/to/document.pdf

# Trace a leaked document back to the source
docker compose exec app npx tsx scripts/trace-leak.ts <tracking-id>
```

### Admin Management

```bash
# Grant admin access to a user
make make-admin EMAIL=user@example.com

# Revoke admin access
make revoke-admin EMAIL=user@example.com

# List all admins
make list-admins
```

See [ADMIN_GUIDE.md](ADMIN_GUIDE.md), [WATERMARKING.md](WATERMARKING.md), and [DESCRIPTION_EXTRACTION.md](DESCRIPTION_EXTRACTION.md) for detailed documentation.

### View Logs

```bash
docker compose logs -f app
```

## Access Control

### Forum Sections

- **HOA**: Accessible to all residents
- **Condo1-4**: Private to residents of each condo

### Documents

Same access control as forums - users can only access documents in HOA section or their own condo section.

### Watermarking

All PDF downloads use **multi-layer watermarking** for security:

**Visible Watermarks** (deterrent):
- Footer and diagonal center watermarks
- Contains: user email, unit number, download timestamp

**Invisible Watermarks** (forensic tracking):
- PDF metadata with tracking ID
- Hidden text layers throughout document
- Survives basic editing attempts

**Audit Trail**:
- All downloads logged to database
- IP address and user agent captured
- Full tracing capability for leaked documents

See [WATERMARKING.md](WATERMARKING.md) for complete details on leak tracing.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="file:./data/dev.db"
NODE_ENV=production

# AI for smart document descriptions (optional but recommended)
# Use either OpenAI OR Gemini (or both for fallback)
OPENAI_API_KEY=your-openai-api-key        # Option 1: OpenAI
GEMINI_API_KEY=your-google-gemini-api-key # Option 2: Gemini

# Optional email configuration
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

**Get an AI API key (choose one):**

**OpenAI (if you already have a key):**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Set `OPENAI_API_KEY` environment variable

**Gemini (free tier available):**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Set `GEMINI_API_KEY` environment variable

See [GEMINI_SETUP.md](GEMINI_SETUP.md) for detailed setup instructions for both providers.

**Working behind a corporate proxy?** See [PROXY_SETUP.md](PROXY_SETUP.md) for configuration.

## Security Features

1. **One User Per Unit** - Invite codes can only be used once
2. **Magic Link Expiration** - Links expire after 15 minutes
3. **HTTP-Only Cookies** - Session cookies protected from XSS
4. **Section-Based Access Control** - Users can't access other condos
5. **Admin Role System** - Role-based access control for document management
6. **Multi-Layer Watermarking** - Visible + invisible + database audit trail
7. **Leak Tracing** - Track leaked documents back to source user
8. **Download Logging** - Complete audit trail with IP and user agent

## Future Enhancements

- [ ] Email integration (send actual magic links)
- [ ] Admin panel for document management
- [ ] Rich text editor for forum posts
- [ ] Email notifications
- [ ] Image upload for forum posts
- [ ] Search functionality
- [ ] HTTPS with reverse proxy

## Deployment

### Local Development
See [SETUP.md](SETUP.md) for detailed setup instructions and troubleshooting.

### Production Deployment
- **Google Cloud Run**: See [CLOUDRUN_DEPLOYMENT.md](CLOUDRUN_DEPLOYMENT.md) for full guide
- **Quick Deploy**: See [QUICKSTART_CLOUDRUN.md](QUICKSTART_CLOUDRUN.md) for 10-minute deployment
- **GitHub Automation**: See [GITHUB_AUTOMATION.md](GITHUB_AUTOMATION.md) for CI/CD setup

## Additional Documentation

- [WATERMARKING.md](WATERMARKING.md) - Leak tracing & forensic watermarking
- [GEMINI_SETUP.md](GEMINI_SETUP.md) - AI description extraction setup
- [PROXY_SETUP.md](PROXY_SETUP.md) - Corporate proxy configuration
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md) - Admin user management
- [TROUBLESHOOTING_AI.md](TROUBLESHOOTING_AI.md) - AI extraction debugging
- [GOOGLE_DRIVE_STAGING.md](GOOGLE_DRIVE_STAGING.md) - Google Drive staging (full guide)
- [DRIVE_QUICKSTART.md](DRIVE_QUICKSTART.md) - Google Drive staging (5-min setup)

## License

MIT License - See LICENSE file for details

---

Built for Scarborough Glen HOA | Powered by Next.js & Docker
