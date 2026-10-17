# Turning on account sync (free)

Account sync lets people sign in with Google and have their Stillpoint data on every device.
The code is already in the app; it stays hidden until these two environment variables exist:
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 1. Create a Supabase project
1. Go to https://supabase.com/dashboard and click **New project** (no credit card needed on the free plan).
2. Name it `stillpoint`, set a database password (save it somewhere), and pick the region closest to you.
3. Wait a minute or two for it to finish setting up.

> The free plan allows 2 active projects. If an old project is in the way, pause it
> (Project → Settings → General → Pause project) or delete it if you're sure you don't need it.

## 2. Create the database tables
1. In the new project, open **SQL Editor** → **New query**.
2. Paste the whole contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It should say "Success".

## 2b. Security hardening (projects set up before this was added)
If you created your tables before `schema.sql` included limits, also run
[`supabase/hardening.sql`](supabase/hardening.sql) once in the SQL Editor. It adds a 10 MB/25 MB data cap,
images-only 10 MB file uploads, and tightens the file-rename rule.

Then, since Stillpoint only uses Google sign-in, turn off the other sign-up methods:
**Authentication → Sign In / Providers → Email → turn off "Enable Email provider"** (and leave anonymous sign-ins off).

## 2c. Study circles
To turn on **Study circles** (friends see each other's weekly focus numbers), run
[`supabase/circles.sql`](supabase/circles.sql) once in the SQL Editor. It's safe to run again. Circles only
share minutes, days studied, streak and "studying now". Row-level security keeps each circle visible
only to its members, and people can hide their numbers in the Circles panel.

## 3. Set up Google sign-in
1. In Supabase, open **Authentication → Sign In / Providers → Google**, and copy the **Callback URL** shown there
   (it looks like `https://abcd1234.supabase.co/auth/v1/callback`). Leave this tab open.
2. Go to https://console.cloud.google.com, create a new project called `Stillpoint`.
3. Open **APIs & Services → OAuth consent screen** (also called *Google Auth Platform*):
   - App name: `Stillpoint`, user support email: your email, audience: **External**, contact email: your email.
   - Under **Audience**, click **Publish app** so anyone can sign in (not just test users).
4. Open **Clients** (or **Credentials → Create credentials → OAuth client ID**):
   - Application type: **Web application**, name: `Stillpoint`.
   - **Authorized redirect URIs** → add the Supabase Callback URL from step 1.
   - Create, then copy the **Client ID** and **Client secret**.
5. Back in Supabase (Google provider page): turn Google **on**, paste the Client ID and Client secret, **Save**.

## 4. Tell Supabase where the app lives
**Authentication → URL Configuration**:
- **Site URL:** `https://stillpoint-study.vercel.app`
- **Redirect URLs:** add `https://stillpoint-study.vercel.app/**`

## 5. Connect Vercel
1. In Supabase, open **Project Settings → API** (or **API Keys**) and copy the **Project URL** and the **anon / public**
   (or **publishable**) key. These are meant to be public; your data is protected by the rules in `schema.sql`.
   Never use the `service_role` / secret key in the app.
2. In Vercel → your Stillpoint project → **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon / publishable key
3. **Deployments** → the latest one → **⋯ → Redeploy**.

## 6. Try it
Open the site → **Settings → Account & sync → Sign in with Google**. Then sign in on your phone with the same
Google account; your notes should appear within a few seconds.
