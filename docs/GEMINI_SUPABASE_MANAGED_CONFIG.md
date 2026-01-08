# Supabase-managed Gemini configuration

Goal: manage the Gemini API key + model from the Supabase Dashboard (no app code changes) while keeping the key off the client.

This repo uses a Supabase Edge Function named `gemini-proxy` that:
- reads `api_key` + `model` from a Supabase table on every request
- calls Gemini `:generateContent` using that key/model
- returns the Gemini response to the app

## 1) Create the table in Supabase

In the Supabase Dashboard → SQL Editor, run:

```sql
create table if not exists public.ai_provider_config (
  provider text primary key,
  api_key text not null,
  model text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ai_provider_config_updated_at on public.ai_provider_config;
create trigger trg_ai_provider_config_updated_at
before update on public.ai_provider_config
for each row
execute function public.set_updated_at();

alter table public.ai_provider_config enable row level security;
-- Intentionally no policies: prevents anon/auth users from selecting the API key.
```

Then insert your Gemini config row:

```sql
insert into public.ai_provider_config (provider, api_key, model)
values ('gemini', 'YOUR_GEMINI_API_KEY', 'gemini-2.5-flash-lite')
on conflict (provider)
do update set api_key = excluded.api_key, model = excluded.model;
```

From now on, you can update `api_key` and `model` directly in the Supabase Table Editor.

## 2) Deploy the Edge Function

This repo already includes the function at:
- supabase/functions/gemini-proxy/index.ts

Using the Supabase CLI:

```bash
supabase functions deploy gemini-proxy --no-verify-jwt
```

Notes:
- `--no-verify-jwt` allows calling the function without requiring a logged-in user.
- If you want to require auth, deploy WITHOUT `--no-verify-jwt` and ensure the app calls it with a valid session.

## 3) Set Edge Function secrets

In Supabase Dashboard → Edge Functions → `gemini-proxy` → Secrets, set (recommended names):

- `SUPABASE_URL`: your project URL (example: `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: your Supabase service role key

Compatibility: this repo also supports `DATABASE_URL` and `SERVICE_ROLE_KEY` if you already use those.

If your project already uses this repo’s existing function patterns, you may also have:
- `ANON_KEY` (not required by `gemini-proxy`, but used by `delete-account`)

## 4) Configure the app to use Supabase

Set these in your app environment (Expo):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The client no longer needs `GEMINI_API_KEY`.

## 5) Verify end-to-end

1. Update the row in `ai_provider_config`:
   - change `model` (example: `gemini-2.5-flash-lite` → another model)
2. Run the app and generate a response.
3. Confirm the response `model` field updates (it uses `_talksy.model` returned from the Edge Function).

## Troubleshooting

### If you see `gemini-proxy failed (404)`

`404` from `supabase.functions.invoke('gemini-proxy')` almost always means:
- the Edge Function `gemini-proxy` is NOT deployed to your Supabase project, OR
- your app is pointing to a different Supabase project (`EXPO_PUBLIC_SUPABASE_URL`) than the one you deployed to.

Verify in Supabase Dashboard:
- Go to **Edge Functions** and confirm `gemini-proxy` is listed.

Deploy (CLI):

```bash
supabase functions deploy gemini-proxy --no-verify-jwt
```

Then restart the app to ensure it’s using the latest `EXPO_PUBLIC_SUPABASE_URL`.

### Verify the Gemini key/model row exists

In Supabase Dashboard → **Table Editor** → `ai_provider_config`:
- Ensure there is exactly one row with `provider = 'gemini'`
- Ensure `api_key` is not empty
- Ensure `model` is not empty (example: `gemini-2.5-flash-lite`)

Or in Supabase Dashboard → **SQL Editor** run:

```sql
select provider, model, updated_at, length(api_key) as api_key_length
from public.ai_provider_config
where provider = 'gemini';
```

- If you get `Gemini configuration not found in Supabase`:
  - Ensure the `ai_provider_config` table exists
  - Ensure there is a row with `provider = 'gemini'`
- If you get Edge Function invocation errors:
  - Ensure the function is deployed (`gemini-proxy`)
  - Ensure secrets are set (`DATABASE_URL`, `SERVICE_ROLE_KEY`)
- If you require auth (JWT verification enabled):
  - Ensure the user is logged in before invoking the function
