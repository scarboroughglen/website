#!/bin/sh

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed the database if needed
echo "Seeding database..."
npx prisma db seed || echo "Seed already ran or no seed script"

# Start the application
echo "Starting application..."
exec npm start
