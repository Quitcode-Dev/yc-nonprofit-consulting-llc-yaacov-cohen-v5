# Project Setup Guide

This document covers the steps required to configure the project from scratch, including Supabase project settings, environment variables, and initial Super Admin creation.

---

## 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values from your Supabase project dashboard:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project anon/public API key |

Both values are found in **Supabase Dashboard → Project Settings → API**.

---

## 2. JWT Expiry (Session Timeout)

Sessions are configured to expire after **30 minutes of inactivity**. To enforce this at the Supabase level:

1. Open the [Supabase Dashboard](https://app.supabase.com) and select your project.
2. Navigate to **Authentication → Settings**.
3. Under **JWT Settings**, set **JWT expiry** to `1800` seconds (30 minutes).
4. Click **Save**.

> **How it works:** The Next.js middleware (`src/lib/supabase/middleware.ts`) calls `supabase.auth.getUser()` on every request to a protected route. If the JWT has expired and no valid refresh token is available, `getUser()` returns no user and the middleware redirects to `/login?expired=true`, which displays an expiry notice on the login page.
>
> For active users, the browser client (`src/lib/supabase/client.ts`) is configured with `autoRefreshToken: true` and `persistSession: true` so that tokens are silently refreshed before they expire during an active session.

---

## 3. Initial Super Admin Creation

The first Super Admin user must be created manually because no authenticated admin exists yet to grant the role.

### Steps

1. **Create the user in Supabase Auth**

   In the Supabase Dashboard, go to **Authentication → Users** and click **Invite user** (or **Add user**). Enter the Super Admin's email address and a temporary password.

2. **Grant Super Admin privileges in the database**

   Open the **SQL Editor** in the Supabase Dashboard and run:

   ```sql
   UPDATE profiles
   SET is_super_admin = true
   WHERE id = '<user-uuid>';
   ```

   Replace `<user-uuid>` with the UUID of the user created in step 1 (visible in the **Authentication → Users** table).

3. **Verify access**

   Log in at `/login` with the Super Admin credentials. You should be redirected to `/admin/dashboard`.

---

## 4. Running the Application Locally

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```
