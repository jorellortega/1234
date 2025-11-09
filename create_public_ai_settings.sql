-- AI settings table for public concierge configuration
-- Run this migration in Supabase before using the new public AI pages.

create extension if not exists "pgcrypto";

create table if not exists public.ai_settings (
  id uuid default gen_random_uuid() primary key,
  setting_key text not null unique,
  setting_value text not null default '',
  description text,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

create or replace function public.handle_ai_settings_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'ai_settings_set_updated_at'
  ) then
    create trigger ai_settings_set_updated_at
    before update on public.ai_settings
    for each row execute function public.handle_ai_settings_updated();
  end if;
end;
$$;

insert into public.ai_settings (setting_key, setting_value, description)
values
  ('public_ai_openai_api_key', '', 'OpenAI key used exclusively by the public concierge.'),
  ('public_ai_default_model', 'gpt-4o-mini', 'Default model powering the public concierge.'),
  ('public_ai_system_prompt_sections', '[]', 'JSON array of system prompt sections for the concierge.'),
  ('public_ai_guardrail_prompt', 'Keep responses concise, factual, and aligned with published information about Infinito.', 'Safety and tone instructions applied to every conversation.'),
  ('public_ai_welcome_message', 'Hi there! I''m Infinito''s public AI concierge. Ask me anything about the platform!', 'Greeting shown to logged-out visitors.'),
  ('public_ai_quick_replies', '[]', 'JSON array of quick reply button definitions.'),
  ('public_ai_actions', '[
    {
      "id": "signup_flow",
      "label": "Create an account",
      "description": "Guide guests through creating an Infinito account.",
      "type": "signup"
    }
  ]', 'JSON array of public concierge actions the UI can trigger.')
on conflict (setting_key) do nothing;

-- Optional helper: expose AI settings via RPC (service role only).
create or replace function public.get_ai_settings(setting_keys text[] default null)
returns setof public.ai_settings
language sql
security definer
set search_path = public
as $$
  select *
  from public.ai_settings
  where setting_keys is null or setting_key = any(setting_keys);
$$;

