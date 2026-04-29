# Enrollytics — Freshmen Enrollment Analytics

A Next.js 14 application for managing and analyzing freshmen enrollment data, built with Supabase as the backend.

## Features

- **Dashboard** — Overview of total students, programs, departments, and enrollment stats
- **Students** — Full CRUD for freshmen student records (name, age, address, enrolled year, program)
- **Programs** — Manage academic programs linked to departments
- **Departments** — Manage academic departments
- **Demo Mode** — Works out of the box with mock data when Supabase is not configured

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase (optional)

Copy the example env file and fill in your Supabase project credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If you skip this step, the app runs in **Demo Mode** using mock data.

### 3. Set up the database (if using Supabase)

Run the migration in your Supabase SQL editor:

```
supabase/migrations/001_initial_schema.sql
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Tech Stack

- [Next.js 14](https://nextjs.org) — App Router, TypeScript
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Supabase](https://supabase.com) — PostgreSQL database
- [@supabase/ssr](https://supabase.com/docs/guides/auth/server-side) — SSR-compatible Supabase client
