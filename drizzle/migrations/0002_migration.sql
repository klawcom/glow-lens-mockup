-- Criar tabela de links de afiliados com modelos customizados para marketplaces
create table if not exists public.links_afiliados (
  loja text primary key,
  modelo text not null,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- Permissões: Leitura pública apenas para links_afiliados (app_config permanece privada e protegida)
grant select on public.links_afiliados to anon, authenticated;
grant all on public.links_afiliados to service_role;
alter table public.links_afiliados enable row level security;

-- Política de leitura pública para exibir os botões "Onde comprar" no app
drop policy if exists "leitura publica links afiliados" on public.links_afiliados;
create policy "leitura publica links afiliados"
  on public.links_afiliados
  for select
  to anon, authenticated
  using (true);

-- Política de escrita: apenas o dono (admin)
drop policy if exists "escrita apenas dono links afiliados" on public.links_afiliados;
create policy "escrita apenas dono links afiliados"
  on public.links_afiliados
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Modelos padrão iniciais para as 4 lojas principais
insert into public.links_afiliados (loja, modelo, ativo) values
  ('Amazon.com.br', 'https://www.amazon.com.br/s?k={busca}', true),
  ('Mercado Livre', 'https://lista.mercadolivre.com.br/{busca}', true),
  ('AliExpress', 'https://www.aliexpress.com/wholesale?SearchText={busca}', true),
  ('Shopee', 'https://shopee.com.br/search?keyword={busca}', true)
on conflict (loja) do nothing;
