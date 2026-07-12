-- CRHub RBAC — pokreni jednom u Supabase SQL editoru (Dashboard → SQL Editor).
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).
-- Aplikacija radi i bez nje, ali je preporučena kao zaštita na nivou baze.

-- 1) Normalizacija emailova + jedinstvenost (bez obzira na velika/mala slova)
update public.users set email = lower(email) where email <> lower(email);

create unique index if not exists users_email_lower_key
  on public.users (lower(email));

-- 2) Dozvoljene uloge (NULL = "na čekanju", bez pristupa)
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role is null or role in ('admin', 'editor', 'user'));

-- 3) Jedan izvršilac po kontaktu (prvo ukloni eventualne duplikate, ostaje najnoviji)
delete from public.assignments a
  using public.assignments b
  where a.contact_id = b.contact_id
    and a.id <> b.id
    and a.assigned_at < b.assigned_at;

create unique index if not exists assignments_contact_id_key
  on public.assignments (contact_id);

-- 4) Indeksi za upite koje aplikacija koristi
create index if not exists assignments_user_id_idx
  on public.assignments (user_id);

create index if not exists interactions_user_created_idx
  on public.interactions (user_id, created_at desc);

create index if not exists interactions_contact_id_idx
  on public.interactions (contact_id);

create index if not exists contact_status_contact_id_idx
  on public.contact_status (contact_id, updated_at desc);

create index if not exists contacts_company_idx
  on public.contacts (company);

-- 5) Prvi administrator
update public.users
  set role = 'admin'
  where lower(email) = 'lukaostojic33@gmail.com';

insert into public.users (email, role)
  select 'lukaostojic33@gmail.com', 'admin'
  where not exists (
    select 1 from public.users where lower(email) = 'lukaostojic33@gmail.com'
  );
