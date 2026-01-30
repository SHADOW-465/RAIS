# Supabase Setup Instructions

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Get your project credentials from Project Settings → API

## Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Storage
SUPABASE_STORAGE_BUCKET=uploads

# AI (Gemini)
GEMINI_API_KEY=your-gemini-api-key

# Authentication
SESSION_SECRET=your-32-char-secret-min-32-chars
```

## Database Setup

### Option 1: Manual Schema Creation

Run the schema creation SQL in Supabase SQL Editor:

1. Go to your Supabase dashboard → SQL Editor
2. Create a "New Query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the query

### Option 2: Using Migrations

Run the migration files in order:

1. `supabase/migrations/001_functions.sql` - Creates helper functions

## Storage Setup

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `uploads`
3. Set the bucket to private (for security)
4. Add the following CORS configuration if needed:
   - Allowed origins: `http://localhost:3000` (development)
   - Allowed methods: GET, POST, PUT, DELETE

## Row Level Security (RLS)

The migration file includes RLS policies that:
- Allow the service role (server-side) full access
- You should add additional policies for authenticated users based on your needs

## Testing

After setup:

1. Run `npm run dev`
2. Test file upload via the Dashboard
3. Verify data appears in Supabase tables
4. Check Storage bucket for uploaded files

## Troubleshooting

### Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (should end with `.supabase.co`)
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not anon key

### Storage Upload Fails
- Check that the `uploads` bucket exists
- Verify bucket permissions allow uploads
- Check browser console for CORS errors

### Database Query Errors
- Run the migration SQL files in Supabase SQL Editor
- Check that all tables and functions were created
- Verify RLS policies don't block service role access
