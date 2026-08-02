# HR & Payroll System

## 1. Local setup
```
npm install
cp .env.local.example .env.local
```
Fill in `.env.local` with your Supabase Project URL, anon key, and service role key
(Project Settings > API in Supabase).

```
npm run dev
```
Visit http://localhost:3000

## 2. Deploy to Vercel (free)
1. Push this folder to a new GitHub repo
2. Go to vercel.com → New Project → import that repo
3. In the Vercel project's Environment Variables, add:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (mark as secret)
   - NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET (value: employee-documents)
4. Deploy. Vercel gives you a free `yourproject.vercel.app` URL immediately.

## 3. Database
Run, in this exact order, in the Supabase SQL Editor:
1. `supabase-schema.sql`
2. `supabase-schema-fix.sql` — closes a privilege-escalation gap in the first script; don't skip this
3. `supabase-schema-addon.sql`
4. `supabase-schema-addon-2-hours.sql`

## 4. First login
Create your admin user in Supabase Authentication, then run the insert
statement from the setup instructions to link it to the `profiles` table
with role `admin`.
