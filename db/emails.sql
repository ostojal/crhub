-- CRHub mejlovi — pokreni jednom u Supabase SQL editoru (Dashboard → SQL Editor).
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).
-- Pravi tabele i storage bucket za slanje mejlova preko Gmail API-ja.
-- Cron za zakazane mejlove je u posebnom fajlu: db/email-cron.sql

-- 1) Gmail veza po korisniku.
--    refresh_token_enc je AES-256-GCM šifrovan u aplikaciji (lib/email/crypto.ts),
--    pa sam pristup bazi ne otkriva token. status='broken' znači da je korisnik
--    opozvao pristup i da mora ponovo da poveže nalog.
create table if not exists public.google_tokens (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  google_email text not null,
  refresh_token_enc text not null,
  status text not null default 'active' check (status in ('active', 'broken')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists google_tokens_user_id_key
  on public.google_tokens (user_id);

-- 2) Šabloni mejlova (naslov + telo). Admin ih održava na /admin/mejlovi.
--    U tekstu se koriste placeholderi: {{ime}} {{prezime}} {{firma}}
--    {{pozicija}} {{grad}} — zamenjuju se podacima kontakta.
create table if not exists public.email_templates (
  id bigint generated always as identity primary key,
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Šabloni priloga — metapodaci; sami fajlovi žive u Storage bucketu
--    'email-attachments' (vidi tačku 6).
create table if not exists public.attachment_templates (
  id bigint generated always as identity primary key,
  name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

-- 4) Dozvoljene CC/BCC adrese (korisnik bira samo sa ove liste)
create table if not exists public.cc_bcc_options (
  id bigint generated always as identity primary key,
  email text not null,
  label text,
  created_at timestamptz not null default now()
);

create unique index if not exists cc_bcc_options_email_key
  on public.cc_bcc_options (lower(email));

-- 5) Outbox — svaki mejl (poslat odmah ili zakazan) ima red ovde.
--    Adrese se snimaju kao snapshot teksta, da kasnija izmena CC/BCC liste
--    ili šablona ne menja ono što je već poslato/zakazano.
--    contact_id ima on delete cascade: brisanjem kontakta nestaju i njegovi
--    zakazani mejlovi (inače bi cron pokušao da šalje obrisanom kontaktu).
create table if not exists public.emails (
  id bigint generated always as identity primary key,
  contact_id bigint references public.contacts(id) on delete cascade,
  user_id bigint not null references public.users(id),
  to_email text not null,
  cc text[] not null default '{}',
  bcc text[] not null default '{}',
  subject text not null,
  body text not null,
  attachment_ids bigint[] not null default '{}',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz not null default now(),
  -- trenutak kada je slanje preuzeto; služi da se prepozna zaglavljen red
  -- ako proces pukne usred slanja
  claimed_at timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  error text,
  created_at timestamptz not null default now()
);

-- Cron traži samo dospele zakazane mejlove
create index if not exists emails_due_idx
  on public.emails (scheduled_at) where status = 'scheduled';

create index if not exists emails_user_created_idx
  on public.emails (user_id, created_at desc);

create index if not exists emails_contact_id_idx
  on public.emails (contact_id);

-- 6) Privatni bucket za priloge (4MB po fajlu). Aplikacija mu pristupa
--    isključivo preko service role ključa, pa nema javnih URL-ova.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('email-attachments', 'email-attachments', false, 4194304)
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit;
