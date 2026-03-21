# Scarborough Glen HOA Portal - Setup Guide

## 🚀 Quick Start with Docker

### Prerequisites
- Docker installed on your system
- Docker Compose installed

### 1. Build and Run

```bash
# Build and start the container
docker compose up --build

# Or run in detached mode
docker compose up -d --build
```

The application will be available at: http://localhost:3000

### 2. Initial Setup

The database will be automatically:
- Initialized with the schema
- Seeded with 16 units (4 condos x 4 units each)

### 3. Invite Codes

After seeding, the following invite codes are available:

**Condo 1:**
- SG-C1-101-2024
- SG-C1-102-2024
- SG-C1-103-2024
- SG-C1-104-2024

**Condo 2:**
- SG-C2-201-2024
- SG-C2-202-2024
- SG-C2-203-2024
- SG-C2-204-2024

**Condo 3:**
- SG-C3-301-2024
- SG-C3-302-2024
- SG-C3-303-2024
- SG-C3-304-2024

**Condo 4:**
- SG-C4-401-2024
- SG-C4-402-2024
- SG-C4-403-2024
- SG-C4-404-2024

### 4. Testing the Application

1. Visit http://localhost:3000
2. Click "New Resident? Sign Up"
3. Enter an invite code (e.g., `SG-C1-101-2024`)
4. Enter your email address
5. Check the Docker logs for the magic link:

```bash
docker compose logs -f
```

Look for a line like:
```
Magic link for your@email.com: http://localhost:3000/api/auth/verify?token=...
```

6. Copy and paste the full URL into your browser to login

## 📁 File Structure

```
/home/eanderso/projects/hoa/website/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   └── documents/    # Document download with watermarking
│   ├── dashboard/        # User dashboard
│   ├── forum/            # Forum pages
│   ├── documents/        # Document library
│   ├── login/            # Login page
│   └── invite/           # Signup with invite code
├── lib/                   # Shared utilities
│   ├── prisma.ts         # Database client
│   └── auth.ts           # Authentication helpers
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Seed script
│   └── migrations/       # Migration files
├── data/                 # Persistent data (SQLite DB, uploads)
├── Dockerfile            # Production container
├── docker-compose.yml    # Docker orchestration
└── docker-entrypoint.sh  # Container startup script
```

## 🔧 Development

### Using Docker for Development

Create a `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - ./data:/app/data
      - /app/node_modules
      - /app/.next
    environment:
      - DATABASE_URL=file:/app/data/dev.db
      - NODE_ENV=development
    command: npm run dev
```

Run with:
```bash
docker compose -f docker-compose.dev.yml up
```

### Database Management

Reset the database:
```bash
docker compose exec app npx prisma migrate reset
```

View database:
```bash
docker compose exec app npx prisma studio
```

## 🔐 Features

- ✅ Magic link authentication (passwordless)
- ✅ Invite-only registration (one user per unit)
- ✅ Private forums (HOA + per-condo sections)
- ✅ Document library with PDF watermarking
- ✅ Secure session management
- ✅ Mobile-responsive design

## 📊 Database Schema

- **User**: Residents linked to their unit
- **Unit**: Property units with unique invite codes
- **MagicToken**: Temporary login tokens
- **Thread**: Forum discussion threads
- **Post**: Forum posts/replies
- **Document**: Uploaded files with access control

## 🛡️ Security Features

1. **Invite-Only Access**: Each unit gets a unique invite code
2. **One User Per Unit**: Invite codes can only be used once
3. **Magic Links**: No passwords to remember or steal
4. **Session Cookies**: HTTP-only, secure cookies
5. **PDF Watermarking**: All downloads include user info
6. **Access Control**: Users can only access HOA + their condo section

## 📝 TODO / Future Enhancements

- [ ] Email integration (SMTP) for magic links
- [ ] Admin panel for document uploads
- [ ] Forum threading and rich text editor
- [ ] Email notifications for new posts
- [ ] File upload for forum posts
- [ ] Search functionality
- [ ] Audit logs
- [ ] HTTPS with reverse proxy (Caddy/Nginx)

## 🐛 Troubleshooting

### Container won't start
```bash
docker compose down -v
docker compose up --build
```

### Database issues
```bash
docker compose down
rm -rf data/*.db
docker compose up --build
```

### Check logs
```bash
docker compose logs -f app
```

## 📧 Support

For questions or issues, contact your HOA administrator.
