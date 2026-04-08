# Fem'Active — Coaching Platform

Full-stack fitness coaching web app for Fem'Active, a premium women's coaching brand.

**Stack:** React + Vite + TypeScript · Tailwind CSS · Supabase (Auth, DB, Realtime, Storage) · Anthropic claude-sonnet-4-6

---

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`
- A [Supabase project](https://supabase.com) (free tier works)
- An [Anthropic API key](https://console.anthropic.com)
- A [Netlify account](https://netlify.com) for deploy

---

## 1. Clone & install

```bash
git clone <your-repo>
cd FEM-ACTIVE
npm install
```

---

## 2. Set up Supabase project

### 2a. Create project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) → New Project. Note your:
- Project URL (e.g. `https://xyzabcdef.supabase.co`)
- Anon/public key (Settings → API)
- Service role key (Settings → API — keep secret!)

### 2b. Run the schema

In the Supabase dashboard → SQL editor, run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

### 2c. Create storage bucket

In Supabase dashboard → Storage → New bucket:
- Name: `checkin-photos`
- Public: **OFF** (private)

Then in the SQL editor, run these storage policies:

```sql
-- Allow clients to upload their own photos
create policy "Client can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'checkin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow clients to read their own photos
create policy "Client can read own photos"
  on storage.objects for select
  using (
    bucket_id = 'checkin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow coach to read all photos
create policy "Coach can read all photos"
  on storage.objects for select
  using (
    bucket_id = 'checkin-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );
```

### 2d. Enable Realtime

In Supabase dashboard → Table Editor → `messages` table → Realtime toggle → Enable.

Or in SQL editor:
```sql
alter publication supabase_realtime add table public.messages;
```

---

## 3. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 4. Create the coach account

1. Sign up at `http://localhost:5173/login` with `fem.active22@gmail.com`
2. Confirm the email (check your inbox)
3. In Supabase SQL editor, set the role to coach:

```sql
update public.profiles
set role = 'coach'
where email = 'fem.active22@gmail.com';
```

4. Also update the `coach_id` for all clients:

```sql
update public.profiles
set coach_id = (select id from public.profiles where role = 'coach' limit 1)
where role = 'client';
```

---

## 5. Deploy the Edge Function

### Install Supabase CLI and link project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### Set secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Deploy

```bash
supabase functions deploy ai-coach
```

Verify it's working:
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/ai-coach \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour!", "clientId": "your-client-uuid"}'
```

---

## 6. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

- Coach login: `fem.active22@gmail.com` → redirects to `/coach`
- Client login: any other registered account → redirects to `/client`

---

## 7. Deploy to Netlify

### Option A — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
netlify deploy --prod
```

### Option B — Netlify Dashboard

1. Push repo to GitHub
2. New site from Git → select repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env vars under Site settings → Environment variables

The `netlify.toml` is already configured with the SPA redirect rule.

---

## 8. Onboarding new clients

1. Client signs up at your Netlify URL
2. They confirm their email
3. In Supabase SQL editor:

```sql
-- Set their coach
update public.profiles
set
  coach_id = (select id from public.profiles where role = 'coach' limit 1),
  forfait = 'Premium 3 mois'
where email = 'cliente@example.com';
```

4. Coach assigns workouts and nutrition from the dashboard

---

## Architecture

```
src/
├── lib/
│   ├── supabase.ts      # Supabase client + helpers
│   ├── auth.ts          # signIn/signUp/signOut
│   └── types.ts         # TypeScript DB types
├── hooks/
│   ├── useAuth.ts       # Auth state + profile
│   ├── useToast.ts      # Toast notifications
│   └── useUnreadMessages.ts  # Real-time unread badge
├── contexts/
│   └── AuthContext.tsx  # Global auth context
├── components/
│   ├── ui/              # Button, Card, Spinner, Toast, StatCard
│   ├── Layout/          # CoachLayout, ClientLayout (sidebar + mobile nav)
│   └── AuthGuard.tsx    # Role-based route protection
└── pages/
    ├── Login.tsx
    ├── coach/           # Dashboard, Clients, Workouts, Nutrition, CheckIns, Messages
    └── client/          # Home, MyWorkouts, Nutrition, CheckIn, Messages

supabase/
├── migrations/
│   └── 001_initial_schema.sql   # Full schema + RLS policies
└── functions/
    └── ai-coach/
        └── index.ts     # Deno edge function → Anthropic claude-sonnet-4-6
```

---

## Features

| Feature | Coach | Client |
|---------|-------|--------|
| Dashboard with stats | ✓ | ✓ (Home) |
| Client management | ✓ | — |
| Workout builder + assign | ✓ | Read + complete |
| Nutrition targets | Set | Read |
| Weekly check-ins | Review + feedback | Submit + photos |
| Progress photos | View all | Upload own |
| Real-time messaging | ✓ | ✓ |
| AI coach (24/7) | — | ✓ |
| Weight progression chart | ✓ | — |
| Exercise progression chart | ✓ | — |
| Mobile responsive | ✓ | ✓ |

---

## Security

- Row-Level Security (RLS) enabled on all tables
- Clients can only access their own data
- Coach can only access clients where `coach_id = their id`
- Storage: photos scoped to `{client_id}/` folder
- Signed URLs for private photo access (1h expiry)
- Edge function uses service role key (server-side only, never exposed to client)

---

## Brand

- **Deep purple:** `#1a0a2e`
- **Violet accent:** `#a855f7`
- **Pale lavender:** `#f5f0ff`
- **Headings:** Playfair Display (italic)
- **Body:** Outfit
