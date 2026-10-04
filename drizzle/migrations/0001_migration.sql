drop trigger if exists on_auth_user_created_admin on auth.users;
drop function if exists public.grant_first_admin();