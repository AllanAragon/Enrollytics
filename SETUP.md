# Enrollytics - Project Setup Guide

This guide will walk you through setting up the Enrollytics project from scratch, including all required services and dependencies.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Overview](#project-overview)
- [Initial Setup](#initial-setup)
- [Supabase Configuration](#supabase-configuration)
- [Google Gemini API Setup](#google-gemini-api-setup)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Running the Application](#running-the-application)
- [Demo Mode](#demo-mode)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- A **Supabase** account (free tier available)
- A **Google Cloud** account (for Gemini API access)

---

## Project Overview

Enrollytics is a Next.js application for managing and analyzing freshmen enrollment data with AI-powered insights.

**Tech Stack:**
- Next.js 16.2.4 (App Router)
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Supabase (PostgreSQL)
- Google Gemini AI
- XLSX (for Excel exports)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Enrollytics
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `@google/genai` - Google Gemini AI SDK
- `@supabase/supabase-js` & `@supabase/ssr` - Supabase client
- `next` - Next.js framework
- `react` & `react-dom` - React library
- `xlsx` - Excel file handling
- `tailwindcss` - CSS framework

---

## Supabase Configuration

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in the details:
   - **Name**: Enrollytics (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your location
   - **Pricing Plan**: Free tier is sufficient for development
5. Click **"Create new project"** and wait for setup to complete (1-2 minutes)

### 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 3. Configure Supabase in Your Project

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
GOOGLE_GEMINI_API_KEY=your-gemini-key-here
```

---

## Google Gemini API Setup

The chatbot feature uses Google's Gemini AI for intelligent responses about enrollment data.

### 1. Enable Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey) or [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project (or select an existing one)
4. Navigate to **APIs & Services** > **Enabled APIs & Services**
5. Click **"+ ENABLE APIS AND SERVICES"**
6. Search for **"Generative Language API"** or **"Gemini API"**
7. Click **Enable**

### 2. Generate API Key

**Option A: Google AI Studio (Simpler)**
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your Google Cloud project
4. Copy the generated API key

**Option B: Google Cloud Console**
1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** > **"API Key"**
3. Copy the generated API key
4. (Optional) Click **"Restrict Key"** to add security restrictions:
   - Under **API restrictions**, select **"Restrict key"**
   - Choose **"Generative Language API"**
   - Save

### 3. Add API Key to Environment

Add your Gemini API key to `.env.local`:

```env
GOOGLE_GEMINI_API_KEY=AIzaSy...your-actual-key-here
```

**Important:** Keep this key secret! Never commit it to version control.

---

## Environment Variables

Your complete `.env.local` file should look like this:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini AI Configuration
GOOGLE_GEMINI_API_KEY=AIzaSyD...
```

**Environment Variable Breakdown:**

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | For production features |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | For production features |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key for AI chatbot | For chatbot functionality |

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Server-only variables (like `GOOGLE_GEMINI_API_KEY`) remain private.

---

## Database Migrations

After configuring Supabase, you need to set up the database schema.

### Method 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Run each migration file in order:

#### Migration 1: Initial Schema

Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`:

```sql
-- Creates departments, programs, and students tables
-- with proper relationships and triggers
```

Click **"Run"** to execute.

#### Migration 2: Add Gender Column

Copy and paste the contents of `supabase/migrations/002_add_gender_column.sql`:

```sql
-- Adds gender field to students table
```

Click **"Run"** to execute.

#### Migration 3: Create Insight View

Copy and paste the contents of `supabase/migrations/003_create_insight_view.sql`:

```sql
-- Creates a view for enrollment analytics
```

Click **"Run"** to execute.

#### Migration 4: Add Location Coordinates

Copy and paste the contents of `supabase/migrations/004_add_location_coordinates.sql`:

```sql
-- Adds latitude and longitude for location-based analytics
```

Click **"Run"** to execute.

### Method 2: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your remote project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Verify Database Setup

After running migrations, verify the tables exist:

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `departments`
   - `programs`
   - `students`
   - `enrollment_insights` (view)

---

## Running the Application

### 1. Start the Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

### 2. Build for Production

```bash
npm run build
npm start
```

### 3. Linting

```bash
npm run lint
```

---

## Demo Mode

Enrollytics has a built-in **Demo Mode** that works without Supabase configuration.

**When Demo Mode Activates:**
- `.env.local` doesn't exist, or
- `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing

**Demo Mode Features:**
- Uses mock data from `lib/mock-data.ts`
- All CRUD operations work (changes aren't persisted)
- Full UI functionality for testing
- Yellow banner displays: "Demo Mode Active"

**To Exit Demo Mode:**
- Configure Supabase as described above
- Restart the development server

---

## Troubleshooting

### Common Issues

#### 1. "AI is not configured" in Chatbot

**Cause:** `GOOGLE_GEMINI_API_KEY` is missing or invalid

**Solution:**
- Verify the API key is set in `.env.local`
- Ensure there are no extra spaces or quotes
- Restart the development server after adding the key
- Check that the Gemini API is enabled in Google Cloud Console

#### 2. "Demo Mode Active" Banner

**Cause:** Supabase environment variables are not set

**Solution:**
- Check `.env.local` exists and contains both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify the values are correct (no typos)
- Restart the development server

#### 3. Database Connection Errors

**Cause:** Invalid Supabase credentials or network issues

**Solution:**
- Verify Supabase project is active (not paused)
- Check Project URL and anon key are copied correctly
- Ensure your IP isn't blocked (check Supabase settings)
- Test the connection in Supabase dashboard

#### 4. "relation does not exist" Database Error

**Cause:** Database migrations haven't been run

**Solution:**
- Run all migrations in order (see [Database Migrations](#database-migrations))
- Verify tables exist in Supabase Table Editor

#### 5. Build Errors

**Cause:** Missing dependencies or TypeScript errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run build
```

#### 6. Port 3000 Already in Use

**Cause:** Another process is using port 3000

**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or run on a different port
PORT=3001 npm run dev
```

### Getting Help

If you encounter issues not covered here:

1. Check the browser console for error messages
2. Check the terminal/console running `npm run dev` for server errors
3. Review Supabase logs in the dashboard
4. Verify all environment variables are set correctly
5. Ensure all migrations have been run successfully

---

## Next Steps

Once your setup is complete:

1. **Add Sample Data:**
   - Navigate to departments page to create departments
   - Add programs linked to departments
   - Add student records

2. **Explore Features:**
   - Dashboard analytics and visualizations
   - AI-powered chatbot for enrollment insights
   - CRUD operations for students, programs, and departments
   - Excel export functionality

3. **Customize:**
   - Modify the dashboard analytics in `components/DashboardAnalytics.tsx`
   - Customize the chatbot prompts in `app/api/chat/route.ts`
   - Add new database fields via Supabase migrations

---

## Security Best Practices

1. **Never commit `.env.local` to version control**
   - It's already in `.gitignore`
   - Use `.env.local.example` as a template

2. **Rotate API keys regularly**
   - Especially if they might have been exposed

3. **Use environment-specific configurations**
   - Different keys for development, staging, and production

4. **Enable Row Level Security (RLS) in Supabase**
   - Add authentication if handling sensitive data
   - Configure policies in Supabase dashboard

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**Ready to build!** 🚀

If you have questions or need help, please refer to the troubleshooting section or check the documentation links above.
