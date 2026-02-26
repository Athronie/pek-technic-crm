# Athrone CRM + Client Portal

Real CRM/client portal built on Supabase Postgres as the source of truth.

## Features
- Supabase Auth login with role-based routing (`admin` and `client` from `app_auth.profiles`).
- Admin dashboard:
  - Product CRUD with search and filters.
  - Client onboarding approval workflow.
  - Price matrix (default + client overrides, tier pricing via `min_qty`, multi-currency).
- Client portal:
  - Product list with effective pricing fallback (client override -> default).
  - Filters by brand/category/PT ref/OEM text.
  - Quote builder and quote request submission.
  - PDF and Excel export for quote lines.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env vars:
   ```bash
   cp .env.example .env
   ```
3. Run SQL in Supabase SQL editor:
   - `supabase/schema.sql`
4. Start app:
   ```bash
   npm run dev
   ```

## Notes
- Tables are created in schemas (`catalog`, `sales`, `app_auth`) as requested.
- In app code, PostgREST table names assume exposed aliases (`products`, `clients`, `prices`, `profiles`, `quotes`, `quote_items`). If your API requires schema-qualified RPC/views, expose them accordingly in Supabase API settings.
