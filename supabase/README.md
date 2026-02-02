# Supabase Backend

This directory contains the Supabase configuration and Edge Functions for the **OpenProject Export Monthly Visualizer**.

## 📂 Structure

- **`supabase/`**: Core Supabase directory.
  - **`config.toml`**: Local Supabase configuration.
  - **`migrations/`**: SQL migration files for setting up the database schema.
  - **`functions/`**: Supabase Edge Functions.
    - **`sync-openproject/`**: Deno-based function to synchronize time entries from OpenProject to Supabase.
  - **`.env.local`**: Environment variables for local development (Git ignored).

## 🗄️ Database Setup

The database schema is defined in `supabase/migrations/`. 

To apply the schema:
- **Local Dev**: Runs automatically when you start Supabase with `npx supabase start`.
- **Manual setup**: You can copy the contents of the migration file into the Supabase Dashboard SQL Editor.
- **Remote Project**: Use `npx supabase db push`.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (includes `npx`)
- [Docker](https://www.docker.com/) (required for running Supabase locally)

### Local Development

Note: We use `npx supabase` as the CLI is not installed globally.

1. **Start Supabase locally**:
   ```powershell
   npx supabase start
   ```

2. **Serve Edge Functions**:
   This allows you to test your functions locally without deploying.
   ```powershell
   npx supabase functions serve sync-openproject --no-verify-jwt --env-file ./supabase/.env.local
   ```

## 🛠 Edge Functions

### `sync-openproject`
Fetches the last 48 hours of time entries from OpenProject and upserts them into the `openproject_timeentries` table.

**Required Environment Variables (Secrets):**
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access.
- `OP_HOST`: Your OpenProject instance URL (e.g., `https://openproject.yourdomain.com`).
- `OP_API_KEY`: API key for OpenProject authentication.

## 📤 Deployment

To deploy the functions to your live Supabase project:

1. **Login**:
   ```powershell
   npx supabase login
   ```

2. **Link Project**: (First time only)
   ```powershell
   npx supabase link --project-ref your-project-ref
   ```

3. **Deploy**:
   ```powershell
   npx supabase functions deploy sync-openproject
   ```

4. **Set Secrets**:
   Ensure all environment variables are set in the Supabase Dashboard or via CLI:
   ```powershell
   npx supabase secrets set OP_HOST=... OP_API_KEY=...
   ```
