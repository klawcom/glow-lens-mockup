create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.produtos_em_alta (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  marca text not null default '',
  categoria text not null default 'Outro',
  foto text,
  por_que text not null default '',
  fontes jsonb not null default '[]'::jsonb,
  posicao int not null,
  pais text not null check (pais in ('Brasil','Mundo')),
  atualizado_em timestamptz not null default now()
);
grant select on public.produtos_em_alta to anon, authenticated;
grant all on public.produtos_em_alta to service_role;
alter table public.produtos_em_alta enable row level security;
create policy "leitura publica" on public.produtos_em_alta for select to anon, authenticated using (true);

create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome text not null,
  dados jsonb not null default '{}'::jsonb,
  fontes jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);
grant select on public.fichas to anon, authenticated;
grant all on public.fichas to service_role;
alter table public.fichas enable row level security;
create policy "leitura publica" on public.fichas for select to anon, authenticated using (true);

-- privadas: só backend
create table public.ai_usage (id bigserial primary key, chave text not null, criado_em timestamptz not null default now());
create index on public.ai_usage (chave, criado_em);
grant all on public.ai_usage to service_role;
grant usage, select on sequence public.ai_usage_id_seq to service_role;
alter table public.ai_usage enable row level security;

create table public.job_status (nome text primary key, travado_ate timestamptz, ultimo_status text, ultimo_erro text, atualizado_em timestamptz default now());
grant all on public.job_status to service_role;
alter table public.job_status enable row level security;

create table public.app_config (chave text primary key, valor text not null);
grant all on public.app_config to service_role;
alter table public.app_config enable row level security;
insert into public.app_config (chave, valor) values ('cron_token', encode(extensions.gen_random_bytes(32), 'hex'));

create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "ver os proprios papeis" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

-- O primeiro usuário cadastrado vira o dono (admin)
create or replace function public.grant_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.grant_first_admin();