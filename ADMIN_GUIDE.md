# 👤 Admin User Guide

## Overview

The HOA portal has a role-based access control system with **Admin** and **Regular User** roles.

**Admins can:**
- ✅ Upload documents to any section
- ✅ Edit document descriptions
- ✅ Delete documents
- ✅ Access admin panel (`/admin`)
- ✅ View all documents across sections

**Regular users can:**
- ✅ View documents in their accessible sections (HOA + their condo)
- ✅ Download watermarked PDFs
- ✅ Participate in forums
- ❌ Cannot access admin panel
- ❌ Cannot upload/delete/edit documents

## Making a User an Admin

### Method 1: Using the Script (Recommended)

```bash
# Make a user an admin
docker compose exec app npx tsx scripts/make-admin.ts user@example.com
```

**Output:**
```
🔍 Looking for user: user@example.com...

✅ Successfully granted admin access!

👤 User: user@example.com
🏠 Unit: Condo1 - 101
🔑 Status: Administrator

They can now access:
  • /admin - Admin panel
  • /admin/upload - Upload documents
  • /admin/documents - Manage documents
```

### Method 2: Direct Database Update

```bash
# Using Prisma Studio
make db-studio
# Navigate to User table
# Find the user
# Set isAdmin = true

# Or via SQL
docker compose exec -T app npx prisma db execute --stdin <<EOF
UPDATE User SET isAdmin = 1 WHERE email = 'user@example.com';
EOF
```

## Revoking Admin Access

```bash
docker compose exec app npx tsx scripts/revoke-admin.ts user@example.com
```

## Admin Panel Features

### 1. Upload Documents (`/admin/upload`)

**Features:**
- Upload PDF files
- Select target section (HOA, Condo1-4)
- Optional manual description
- Auto-extraction of PDF metadata/content

**Access Control:**
- Only admins can upload
- API endpoint validates admin role

### 2. Manage Documents (`/admin/documents`)

**Features:**
- View all documents in a table
- Edit descriptions inline
- Delete documents (with confirmation)
- Grouped by section

**Table Columns:**
- Section (badge)
- Filename
- Description (editable)
- Upload date
- Actions (Edit/Delete)

**Workflow:**
1. Click **Edit** → Enter new description → Click **Save**
2. Click **Delete** → Confirm deletion → Document removed from storage and database

## API Endpoints

### Admin-Protected Endpoints

All admin endpoints require authentication + `isAdmin = true`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/documents/upload` | POST | Upload document |
| `/api/admin/documents` | GET | List all documents |
| `/api/admin/documents/[id]` | PATCH | Update description |
| `/api/admin/documents/[id]` | DELETE | Delete document |

**Error Responses:**

```json
// Not logged in
{ "error": "Unauthorized - Please log in" }  // 401

// Not admin
{ "error": "Forbidden - Admin access required" }  // 403
```

## Database Schema

### User Model

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  unitId    String
  unit      Unit     @relation(fields: [unitId], references: [id])
  isAdmin   Boolean  @default(false)  // ← Admin flag
  createdAt DateTime @default(now())
  posts     Post[]
}
```

**Default:** `isAdmin = false` (regular user)

## Security Considerations

### 1. Admin Checks

Admin access is verified at **two layers**:

**Layer 1: Page Level** (Server Components)
```typescript
// app/admin/page.tsx
if (!user.isAdmin) {
  redirect('/dashboard')
}
```

**Layer 2: API Level** (All admin endpoints)
```typescript
// app/api/admin/documents/route.ts
const adminCheck = await requireAdmin()
if (adminCheck) return adminCheck
```

**Why both?**
- Page check: Prevents unauthorized UI access
- API check: Prevents direct API calls (e.g., via curl)

### 2. Delete Document Flow

When deleting a document:

1. **Admin check** (API enforces)
2. **Fetch document** from database
3. **Delete from S3** storage (MinIO/GCP)
4. **Delete from database** (cascades to DownloadLog)
5. **Permanent** - no undo!

### 3. Audit Trail

All admin actions are logged:

```bash
# In application logs
[DOWNLOAD AUDIT] Doc: abc-123 | User: admin@example.com | ...
```

Future enhancement: Add `AdminActionLog` table to track:
- Who deleted what
- Who edited what
- When uploads happened

## Common Tasks

### See All Admins

```bash
docker compose exec -T app npx prisma db execute --stdin <<EOF
SELECT email, isAdmin FROM User WHERE isAdmin = 1;
EOF
```

### List All Users (with admin status)

```bash
docker compose exec app npx tsx scripts/make-admin.ts nonexistent@test.com
# (Will show all users with admin status)
```

### Make First User Admin (Bootstrap)

```bash
# 1. Register a user via the website
# 2. Make them admin
docker compose exec app npx tsx scripts/make-admin.ts your-email@example.com

# 3. Login and access /admin
```

### Bulk Admin Grant (Multiple Users)

```bash
# Create a script
for email in admin1@hoa.com admin2@hoa.com admin3@hoa.com; do
  docker compose exec app npx tsx scripts/make-admin.ts "$email"
done
```

## Troubleshooting

### Problem: "Forbidden - Admin access required"

**Cause:** User is not an admin

**Solution:**
```bash
# Verify user is admin
docker compose exec app npx tsx scripts/make-admin.ts your-email@example.com

# Check database
make db-studio
# Navigate to User table, verify isAdmin = true
```

### Problem: Can't access `/admin`

**Cause 1:** Not logged in
- **Solution:** Login first at `/login`

**Cause 2:** Not an admin
- **Solution:** Use `make-admin.ts` script

**Cause 3:** Session expired
- **Solution:** Logout and login again

### Problem: Upload fails with 403

**Cause:** API endpoint checks admin role independently

**Solution:**
```bash
# Verify admin status
docker compose exec app npx tsx scripts/make-admin.ts your-email@example.com

# Clear browser cache and re-login
```

## Future Enhancements

- [ ] Admin user management UI (promote/demote via website)
- [ ] Audit log table for all admin actions
- [ ] Granular permissions (upload-only, delete-only, etc.)
- [ ] Super admin role (can manage other admins)
- [ ] Admin activity dashboard
- [ ] Bulk document operations
- [ ] Document versioning
- [ ] Restore deleted documents (soft delete)

## Best Practices

### For HOA Board Members

1. **Limit admin access** - Only board members and treasurer
2. **Review regularly** - Check who has admin access quarterly
3. **Audit trail** - Check Prisma Studio DownloadLog periodically
4. **Document naming** - Use clear, consistent filenames
5. **Descriptions** - Always add descriptions for important docs

### For Developers

1. **Always use `requireAdmin()`** for admin API endpoints
2. **Never trust client** - Check admin status server-side
3. **Log admin actions** - Use console.log at minimum
4. **Test access control** - Verify non-admins can't access admin routes
5. **Keep it simple** - Don't over-engineer permissions

---

**🔒 Security Note:** Admin access grants significant control over the portal. Only grant admin status to trusted HOA board members.
