# 🏗️ Scarborough Glen Owner Portal — 5–7 Day Build Plan (Docker + Open Source Only)

## 🎯 Goal
Build a secure, invite-only HOA portal with:
- Magic link authentication
- One user per unit
- 5 private sections (HOA + 4 Condos)
- Private forums
- Document storage with watermarking

**Constraints:**
- 100% open source
- Minimal cost
- Runs in Docker
- Uses SQLite (no always-on DB)

---

# 🧱 FINAL STACK

- **Frontend + Backend:** Next.js (App Router)
- **Database:** SQLite (via Prisma)
- **Auth:** Custom magic link
- **Email:** SMTP (Gmail or Resend optional)
- **PDF Watermarking:** pdf-lib
- **Containerization:** Docker

---

# 📅 DAY-BY-DAY PLAN

---

# 🚀 DAY 1 — PROJECT SETUP + DOCKER

## 1. Initialize Project

```bash
npx create-next-app@latest hoa-portal
cd hoa-portal
```

## 2. Install Dependencies

```bash
npm install prisma @prisma/client sqlite3 nodemailer pdf-lib
```

## 3. Setup Prisma

```bash
npx prisma init
```

Update `schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 4. Create Dockerfile

```Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 5. Create docker-compose.yml

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
    environment:
      - DATABASE_URL=file:/app/data/dev.db
```

---

## 6. Run App

```bash
docker compose up --build
```

---

# 🔐 DAY 2 — DATABASE + AUTH FOUNDATION

## 1. Define Database Models

```prisma
model User {
  id        String @id @default(uuid())
  email     String @unique
  unitId    String
  createdAt DateTime @default(now())
}

model Unit {
  id            String @id @default(uuid())
  condo         String
  unitNumber    String
  inviteCode    String @unique
  inviteUsed    Boolean @default(false)
}

model MagicToken {
  id        String @id @default(uuid())
  email     String
  token     String
  expiresAt DateTime
}
```

---

## 2. Run Migration

```bash
npx prisma migrate dev --name init
```

---

## 3. Magic Link Endpoint

Create:

```
/app/api/auth/request-link/route.ts
```

Logic:
- Generate token
- Save in DB
- Send email

---

## 4. Login Verification Endpoint

```
/app/api/auth/verify/route.ts
```

Logic:
- Validate token
- Check expiration
- Create session cookie

---

# 📨 DAY 3 — INVITE SYSTEM (1 PER UNIT)

## 1. Seed Units

Create script:

```bash
npx prisma db seed
```

Each unit gets:
- condo
- unit number
- invite code

---

## 2. Invite Flow

Route:

```
/invite?code=XYZ
```

Steps:
1. Validate code
2. Check not used
3. Allow signup
4. Mark inviteUsed = true

---

## 3. Enforce One User Per Unit

- Block if inviteUsed = true

---

# 💬 DAY 4 — FORUM SYSTEM

## 1. Models

```prisma
model Thread {
  id        String @id @default(uuid())
  title     String
  section   String
  createdAt DateTime @default(now())
}

model Post {
  id        String @id @default(uuid())
  threadId  String
  userId    String
  content   String
  createdAt DateTime @default(now())
}
```

---

## 2. Sections

- HOA
- Condo1
- Condo2
- Condo3
- Condo4

---

## 3. Permission Logic

- User can only access:
  - HOA
  - Their condo

---

# 📂 DAY 5 — DOCUMENT SYSTEM + WATERMARKING

## 1. File Storage

Store in:

```
/app/data/uploads
```

---

## 2. Document Model

```prisma
model Document {
  id       String @id @default(uuid())
  filename String
  section  String
}
```

---

## 3. Download Endpoint with Watermark

```ts
import { PDFDocument } from 'pdf-lib'
```

Steps:
1. Load PDF
2. Add watermark text
3. Stream to user

---

## 4. Watermark Content

- Email
- Unit
- Timestamp

---

# 📊 DAY 6 — DASHBOARD + PERMISSIONS

## Features:

- Show recent posts
- Show documents
- Section-based filtering

---

## Middleware

Protect routes:

```ts
if (!user) redirect('/login')
```

---

# 🧰 DAY 7 — ADMIN + POLISH

## Admin Features

- Create units
- Reset invite codes
- Upload documents

---

## Security Checklist

- HTTPS (use reverse proxy later)
- Token expiration
- Input validation
- No direct file access

---

# 🚀 FINAL RUN COMMAND

```bash
docker compose up --build
```

App runs at:

```
http://localhost:3000
```

---

# 🧠 FUTURE IMPROVEMENTS

- Email notifications
- Audit logs
- Multi-user per unit
- Mobile UI improvements

---

# ✅ DONE

You now have a fully open-source, low-cost HOA platform running in Docker with:
- Magic link login
- Invite-only access
- Private forums
- Watermarked documents

---

If you want next step, ask for:
- Full production deployment guide (domain + HTTPS)
- Backup strategy for SQLite
- UI design upgrade

