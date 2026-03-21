# MinIO S3 Storage Setup

## Overview

The HOA Portal now uses **MinIO** - an S3-compatible object storage system - for storing all documents. Each section (HOA and Condos 1-4) has its own dedicated bucket.

## Architecture

### Services

1. **minio** - S3-compatible object storage
   - Ports: 9000 (API), 9001 (Console)
   - Credentials: minioadmin / minioadmin

2. **minio-init** - One-time bucket initialization
   - Creates 5 buckets: hoa, condo1, condo2, condo3, condo4
   - Sets download permissions

3. **app** - Next.js application
   - Connected to MinIO via environment variables
   - Uploads/downloads documents with watermarking

### Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `hoa` | All residents | HOA-wide documents |
| `condo1` | Condo 1 residents | Condo 1 specific documents |
| `condo2` | Condo 2 residents | Condo 2 specific documents |
| `condo3` | Condo 3 residents | Condo 3 specific documents |
| `condo4` | Condo 4 residents | Condo 4 specific documents |

## Usage

### Accessing MinIO Console

```bash
# Open MinIO Console in browser
make minio-console

# Or manually visit:
# http://localhost:9001
# Username: minioadmin
# Password: minioadmin
```

### Uploading Documents

1. **Via Web UI** (Recommended):
   - Login to the portal
   - Navigate to **Admin** → **Upload Documents**
   - Select section (HOA or Condo)
   - Choose PDF file
   - Click Upload

2. **Via API**:
   ```bash
   curl -X POST http://localhost:3000/api/documents/upload \
     -F "file=@document.pdf" \
     -F "section=HOA" \
     -b "userId=YOUR_USER_ID"
   ```

### Downloading Documents

All downloads are automatically:
- Fetched from MinIO
- Watermarked with user info (email, unit, timestamp)
- Delivered as PDF

Access via: `/documents` page or direct API

### Managing Buckets

```bash
# List all buckets
make minio-buckets

# Or use MinIO client directly
docker compose exec minio mc ls local

# View bucket contents
docker compose exec minio mc ls local/hoa
docker compose exec minio mc ls local/condo1
```

## Environment Variables

The application uses generic S3-compatible settings (configured in docker-compose.yml):

```env
STORAGE_PROVIDER=local          # 'local' for MinIO, 'aws' for S3, 'gcp' for Cloud Storage
S3_ENDPOINT=minio               # Hostname/endpoint
S3_PORT=9000                    # Port number
S3_ACCESS_KEY=minioadmin        # Access key / Access Key ID
S3_SECRET_KEY=minioadmin        # Secret key / Secret Access Key
S3_USE_SSL=false                # true for HTTPS, false for HTTP
S3_REGION=us-east-1             # AWS region (optional for MinIO)
```

These generic variable names allow seamless switching between MinIO (local), AWS S3, GCP Cloud Storage, or any S3-compatible provider.

## File Storage Details

### Upload Process

1. User uploads PDF via `/admin/upload`
2. File validated (PDF only, max size check)
3. File stored in MinIO bucket based on section
4. Metadata stored in database (filename, section, S3 path)

### Download Process

1. User requests document from `/documents`
2. System checks access permissions
3. File retrieved from MinIO
4. PDF watermarked with user info
5. Watermarked PDF streamed to user

### Watermarking

Every downloaded PDF includes:
- **Footer**: `email | Condo X - Unit XXX | timestamp`
- **Diagonal**: Semi-transparent watermark across page

## Security

- ✅ Section-based bucket isolation
- ✅ Access control enforced at app level
- ✅ All downloads watermarked
- ✅ Buckets not publicly accessible (except through app)
- ✅ Documents cannot be accessed without authentication

## Troubleshooting

### Buckets not created

```bash
# Check minio-init logs
docker compose logs minio-init

# Manually create buckets
docker compose exec minio mc mb local/hoa
```

### Connection errors

```bash
# Check MinIO is healthy
docker compose ps

# Should show minio as "healthy"
# If not, check logs:
docker compose logs minio
```

### Upload fails

1. Check MinIO is running: `docker compose ps`
2. Verify buckets exist: `make minio-buckets`
3. Check app logs: `make logs`
4. Ensure file is PDF format

## Production Deployment

For production, simply update the S3 environment variables:

1. **AWS S3**:
   ```env
   STORAGE_PROVIDER=aws
   S3_ENDPOINT=s3.amazonaws.com
   S3_PORT=443
   S3_ACCESS_KEY=<your-aws-access-key-id>
   S3_SECRET_KEY=<your-aws-secret-access-key>
   S3_USE_SSL=true
   S3_REGION=us-west-2
   ```

2. **GCP Cloud Storage** (S3-compatible):
   ```env
   STORAGE_PROVIDER=gcp
   S3_ENDPOINT=storage.googleapis.com
   S3_PORT=443
   S3_ACCESS_KEY=<your-gcp-access-key>
   S3_SECRET_KEY=<your-gcp-secret>
   S3_USE_SSL=true
   ```

3. **DigitalOcean Spaces**:
   ```env
   STORAGE_PROVIDER=custom
   S3_ENDPOINT=nyc3.digitaloceanspaces.com
   S3_PORT=443
   S3_ACCESS_KEY=<your-spaces-key>
   S3_SECRET_KEY=<your-spaces-secret>
   S3_USE_SSL=true
   S3_REGION=nyc3
   ```

4. **Any S3-compatible service** (Backblaze B2, Wasabi, Cloudflare R2, etc.)

## Commands Reference

```bash
make minio-console   # Open MinIO web console
make minio-buckets   # List all buckets
make up              # Start all services including MinIO
make down            # Stop all services
make logs            # View application logs
```

## File Locations

- **Code**: `lib/storage.ts` - Universal S3-compatible storage client
- **Upload API**: `app/api/documents/upload/route.ts`
- **Download API**: `app/api/documents/download/[id]/route.ts`
- **Admin UI**: `app/admin/upload/page.tsx`
- **Data**: MinIO volume `minio-data` (persistent in local development)

## Benefits of MinIO

✅ S3-compatible (easy migration to AWS S3)
✅ Self-hosted (no external dependencies)
✅ Fast and lightweight
✅ Perfect for local development
✅ Free and open source
✅ Production-ready
✅ Built-in web console
✅ Bucket isolation per section
