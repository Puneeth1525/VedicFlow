# Supabase Database Setup Guide

Follow these steps to set up your Supabase database for VedicFlo.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Enter project details:
   - **Name**: vedicflo (or your preferred name)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start
4. Click "Create new project" and wait 2-3 minutes for setup

## Step 2: Get Database Connection Strings

1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Select **URI** tab
4. You'll see two connection strings:

   **Connection pooling (recommended for serverless):**
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

   Transaction Poooler: postgresql://postgres.lodysyujdrfqgpeljaor:Andromeda1525*@aws-1-us-east-1.pooler.supabase.com:6543/postgres

   Session Poooler:  postgresql://postgres.lodysyujdrfqgpeljaor:Andromeda1525*@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```

   **Direct connection:**
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-west-1.compute.amazonaws.com:5432/postgres

   postgresql://postgres:Andromeda1525*@db.lodysyujdrfqgpeljaor.supabase.co:5432/postgres
   ```

5. Copy both and replace `[YOUR-PASSWORD]` with your actual database password

## Step 3: Get Supabase API Keys

1. Go to **Settings** → **API**
2. You'll need three values:
   - **Project URL**: `https://xxxxx.supabase.co`

https://lodysyujdrfqgpeljaor.supabase.co

   - **anon public** key: `eyJh...` (long JWT token)

"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZHlzeXVqZHJmcWdwZWxqYW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mzc3OTEsImV4cCI6MjA3NzUxMzc5MX0.jJSDD7dx0eSQ6EQk7NJK3dDemCqcaIR6KyBmqSNcMaA"

   - **service_role** key: `eyJh...` (longer JWT token - keep secret!)

   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZHlzeXVqZHJmcWdwZWxqYW9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTkzNzc5MSwiZXhwIjoyMDc3NTEzNzkxfQ.XQSsr5iHzqj0f8z2-rtx7-r-4cfKjb2GVDuLzpM1TtI"

## Step 4: Update .env.local

Update your `/Users/ppuneeth/vedic-chanting-coach/.env.local` file with the values:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="<Connection pooling string from Step 2>"
DIRECT_URL="<Direct connection string from Step 2>"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<Project URL from Step 3>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key from Step 3>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Step 3>
```

Example:
```env
DATABASE_URL="postgresql://postgres.abcdefg:MyP@ssw0rd123@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.abcdefg:MyP@ssw0rd123@aws-0-us-west-1.compute.amazonaws.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL=https://abcdefg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Run Database Migrations

Once your .env.local is updated, run:

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma db push

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

## Step 6: Set Up Storage Bucket for Audio Files

1. In Supabase dashboard, go to **Storage**
2. Click "Create new bucket"
3. Name it: `recordings`
4. **Public bucket**: Yes (so users can play back their recordings)
5. Click "Create bucket"

### Set up Storage Policies

1. Click on the `recordings` bucket
2. Go to **Policies** tab
3. Add these policies:

**Policy 1: Allow authenticated users to upload**
- Policy name: `Allow authenticated uploads`
- Policy command: `INSERT`
- Target roles: `authenticated`
- Policy definition:
  ```sql
  (bucket_id = 'recordings'::text) AND (auth.role() = 'authenticated'::text)
  ```

**Policy 2: Allow public reads**
- Policy name: `Allow public reads`
- Policy command: `SELECT`
- Target roles: `public`
- Policy definition:
  ```sql
  bucket_id = 'recordings'::text
  ```

## Step 7: Verify Setup

Run your Next.js dev server and check:

```bash
npm run dev
```

Your database should now be connected! 🎉

## Troubleshooting

### Connection Issues
- Make sure password is URL-encoded if it contains special characters
- Check that Supabase project is fully initialized (green checkmark)
- Verify your IP isn't blocked (Supabase free tier allows all IPs by default)

### Migration Errors
- Ensure .env.local has correct DATABASE_URL and DIRECT_URL
- Try `npx prisma db push --force-reset` to reset database (⚠️ deletes all data)

### Storage Issues
- Verify bucket name is exactly `recordings`
- Check that storage policies are correctly configured
- Make sure NEXT_PUBLIC_SUPABASE_URL and keys are set

## Next Steps

Once setup is complete, you can:
- View your database in Prisma Studio: `npx prisma studio`
- Check Supabase dashboard to see tables under **Database** → **Tables**
- Test uploading recordings from the practice page
- View user data in the dashboard

Happy chanting! 🕉️
