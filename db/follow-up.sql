-- CRHub follow up — pokreni u Supabase SQL editoru (Dashboard → SQL Editor).
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).
--
-- PAŽNJA: odeljak 1 i odeljak 2 se pokreću ODVOJENO, jedan pa drugi.
-- Postgres ne dozvoljava da se nova vrednost enuma upotrebi u istoj
-- transakciji u kojoj je dodata, a SQL editor sve selektovano izvršava kao
-- jednu transakciju.

-- ============================================================
-- 1) NAJPRE OVO, SAMO ZA SEBE
-- ============================================================
-- Dva nova stanja u enumu public.status, između "Poslato" i "Dobijen odgovor":
--   "Poslati follow up" — prošlo je dovoljno radnih dana od prvog mejla, a
--                         odgovor nije stigao; upisuje ga cron
--   "Poslat follow up"  — follow up je poslat; upisuje se automatski pri
--                         slanju drugog mejla istom kontaktu

alter type public.status add value if not exists 'Poslati follow up' after 'Poslato';
alter type public.status add value if not exists 'Poslat follow up' after 'Poslati follow up';

-- ============================================================
-- 2) TEK POSLE OVO
-- ============================================================
-- Globalna podešavanja aplikacije. Jedan jedini red — otud boolean ključ sa
-- check (id): drugi red se prosto ne može ubaciti.
--
-- follow_up_days i call_reminder_days broje RADNE dane (ponedeljak–četvrtak);
-- petak, subota i nedelja se ne računaju jer se tada ne šalju mejlovi.
-- Spisak dana je konstanta u kodu (lib/follow-up.ts), ovde se podešava samo
-- koliko ih treba da prođe i da li su podsetnici uopšte uključeni.
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  follow_up_enabled boolean not null default true,
  follow_up_days integer not null default 3
    check (follow_up_days between 1 and 30),
  call_reminder_enabled boolean not null default true,
  call_reminder_days integer not null default 3
    check (call_reminder_days between 1 and 30),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- Red za follow up se traži po poslednjem poslatom mejlu po korisniku
create index if not exists emails_sent_user_idx
  on public.emails (user_id, sent_at desc) where status = 'sent';

-- Podsetnik za poziv otpada čim se evidentira poziv posle follow up-a
create index if not exists interactions_contact_created_idx
  on public.interactions (contact_id, created_at desc);

-- Provera:
--   select unnest(enum_range(null::public.status));  -- 8 vrednosti
--   select * from public.app_settings;               -- jedan red
