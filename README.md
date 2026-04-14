# Closet Atlas

Closet Atlas is a full rebuild of the original Flask closet app into a Vercel-friendly
Next.js stack with Supabase-ready auth, storage, and database flows.

## What changed

- Premium, mobile-first UI for desktop and mobile browsing
- Login page with Supabase auth wiring
- Garment intake flow:
  - upload a garment photo
  - enter a garment name
  - auto-extract color and wardrobe attributes with OpenAI vision
  - upload a tag photo
  - auto-extract composition and care information
  - store everything for filtering and future AI features
- Closet browser with search, filters, and detail panel
- Supabase schema ready for garments and storage buckets

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file with:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4o-mini
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

## Supabase

Apply `supabase/schema.sql` to your project, then create these storage buckets:

- `garment-images`
- `garment-tags`

The app uses the Supabase service role key on the server for uploads and inserts.

For auth, turn on the Email provider in Supabase Auth and set these URL settings:

- Site URL: your deployed Vercel URL
- Additional redirect URLs:
  - `http://localhost:3000/login`
  - your Vercel preview URLs
  - your production `/login` URL

The schema also creates a `profiles` table and a trigger so new auth users get a
matching profile row automatically.

## Check the Supabase connection

After you run the app locally or deploy it, open:

`/api/health/supabase`

If everything is wired correctly, it will return `{ "ok": true, "connected": true }`.
If something is missing, it will tell you whether the problem is the env vars,
the tables, or the service role setup.

If Supabase still says a table is missing right after running the SQL, refresh the
schema cache by running this once in the SQL editor:

```sql
NOTIFY pgrst, 'reload schema';
```

## OpenAI analysis

The analysis routes use the OpenAI Responses API with structured outputs, which is
the right fit for garment metadata extraction and tag OCR workflows.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, import the repository and let it detect Next.js.
3. Add the same environment variables from `.env.local` in the Vercel dashboard:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` if you want to override the default

4. Deploy.

The app is already set up for a mobile-friendly installable experience with a
manifest and service worker, so it should feel more like a real app on phones.
