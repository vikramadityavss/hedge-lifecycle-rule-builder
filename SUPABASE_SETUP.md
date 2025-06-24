# Supabase Setup for Hedge Lifecycle Rule Builder

This document provides instructions on how to set up Supabase for the Hedge Lifecycle Rule Builder application.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm/pnpm installed
- Angular CLI installed

## Step 1: Create a Supabase Project

1. Log in to your Supabase account
2. Create a new project from your dashboard
3. Note down your project URL and anon key (found under Project Settings > API)

## Step 2: Set Up Database Tables

You can set up the database tables in two ways:

### Option 1: Using the Supabase UI

1. Navigate to the SQL Editor in your Supabase project
2. Copy the contents of the `sql/supabase_migration.sql` file
3. Paste and run the SQL in the SQL Editor

### Option 2: Using the Supabase CLI

1. Install the Supabase CLI:
   ```
   npm install -g supabase
   ```

2. Log in to Supabase:
   ```
   supabase login
   ```

3. Run the migration:
   ```
   supabase db push --project-ref YOUR_PROJECT_REF --db-url YOUR_DB_URL
   ```

## Step 3: Configure Environment Variables

1. Update the environment files with your Supabase credentials:

   In `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: true,
     supabaseUrl: 'https://YOUR_PROJECT_URL.supabase.co',
     supabaseKey: 'YOUR_ANON_KEY'
   };
   ```

   In `src/environments/environment.development.ts`:
   ```typescript
   export const environment = {
     production: false,
     supabaseUrl: 'https://YOUR_PROJECT_URL.supabase.co',
     supabaseKey: 'YOUR_ANON_KEY'
   };
   ```

## Step 4: Install Required Dependencies

Run the following command to install the Supabase client library:

```bash
npm install @supabase/supabase-js
```

Or if you're using pnpm:

```bash
pnpm add @supabase/supabase-js
```

## Step 5: Rename Modified Files

Several files have been created with `.supabase` suffix to avoid overwriting existing files. You'll need to rename these files to make them active:

1. Rename `rule-builder.component.supabase.ts` to `rule-builder.component.ts`
2. Rename `rule-builder.component.supabase.html` to `rule-builder.component.html`
3. Rename `rule.service.supabase.ts` to `rule.service.ts`
4. Rename `lifecycle-stage.service.supabase.ts` to `lifecycle-stage.service.ts`

## Step 6: Enable Authentication in Supabase

1. Go to Authentication > Settings in your Supabase project
2. Enable Email authentication
3. If you want to, set up additional providers like Google, GitHub, etc.

## Step 7: Configure Row Level Security (RLS)

The SQL migration script already sets up RLS policies. You can verify these in the Supabase Dashboard:

1. Go to Database > Tables
2. Click on a table
3. Navigate to the "Policies" tab to view and edit RLS policies

## Step 8: Run Your Application

Start your Angular application:

```bash
ng serve
```

Now you should be able to:

1. Register a new user
2. Log in with your credentials
3. Create and manage lifecycle stages and rules with data stored in Supabase

## Troubleshooting

- If you encounter CORS issues, make sure to add your application URL to the allowed origins in your Supabase project settings
- Check the browser console for any API errors
- Verify your environment variables are correctly set
- Ensure that the Supabase RLS policies are properly configured to allow your operations