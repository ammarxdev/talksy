-- Stores provider configuration for server-side AI calls (Grok)

create table if not exists public.ai_provider_config (
  provider text primary key,
  api_key text not null,
  model text not null,
  updated_at timestamptz not null default now()
);

-- Keep updated_at current
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

-- Intentionally no RLS policies.
-- This prevents anon/auth users from reading the API key.
-- The Supabase Dashboard (admin) and Edge Functions (service role) can still manage/read it.
