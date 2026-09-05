-- CRHub projekti — pokreni u Supabase SQL editoru (Dashboard → SQL Editor),
-- POSLE db/emails.sql, db/follow-up.sql i db/rbac.sql (dira njihove tabele).
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).
--
-- Kontakti ostaju zajednički: isti ljudi se kontaktiraju za svaki projekat,
-- pa se firma, ime, mejl i telefon vode na jednom mestu. Sve što nastaje
-- radom na projektu — dodele, kontaktiranja, statusi, mejlovi i mejl šabloni
-- — dobija project_id i vidi se samo unutar tog projekta.
--
-- Sve što je do sada upisano pripada DigiHack-u; GreenTour kreće od nule
-- (bez dodela, bez statusa, bez istorije).
--
-- Globalno (namerno bez project_id): users, google_tokens, cc_bcc_options
-- (interne adrese tima) i app_settings (rokovi za follow up).

-- ============================================================
-- 1) Tabela projekata
-- ============================================================
-- slug je kratka oznaka iz URL-a/kolačića ("digihack"), name je ono što se
-- vidi u aplikaciji. Arhiviran projekat ostaje u bazi sa svom istorijom, ali
-- se više ne nudi u biraču projekata.
create table if not exists public.projects (
  id bigint generated always as identity primary key,
  slug text not null,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists projects_slug_key
  on public.projects (lower(slug));

-- Redosled u biraču: prvo napravljen projekat je podrazumevani
create index if not exists projects_created_at_idx
  on public.projects (created_at);

insert into public.projects (slug, name)
  select 'digihack', 'DigiHack'
  where not exists (
    select 1 from public.projects where lower(slug) = 'digihack'
  );

insert into public.projects (slug, name)
  select 'greentour', 'GreenTour'
  where not exists (
    select 1 from public.projects where lower(slug) = 'greentour'
  );

-- ============================================================
-- 2) project_id na tabelama koje pripadaju projektu
-- ============================================================
-- Postupak je za svaku tabelu isti: dodaj kolonu, upiši DigiHack u sve
-- postojeće redove, pa je tek onda proglasi obaveznom.
--
-- Strani ključ: istorija (dodele, kontaktiranja, statusi, mejlovi) je
-- `restrict` — projekat sa istorijom se ne može obrisati ni greškom. Šabloni
-- su `cascade`, jer su podešavanje projekta, a ne njegova istorija.

do $$
declare
  digihack_id bigint;
begin
  select id into digihack_id from public.projects where lower(slug) = 'digihack';

  -- --- assignments ---
  alter table public.assignments add column if not exists project_id bigint;
  update public.assignments set project_id = digihack_id where project_id is null;
  alter table public.assignments alter column project_id set not null;
  alter table public.assignments drop constraint if exists assignments_project_id_fkey;
  alter table public.assignments add constraint assignments_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete restrict;

  -- --- interactions ---
  alter table public.interactions add column if not exists project_id bigint;
  update public.interactions set project_id = digihack_id where project_id is null;
  alter table public.interactions alter column project_id set not null;
  alter table public.interactions drop constraint if exists interactions_project_id_fkey;
  alter table public.interactions add constraint interactions_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete restrict;

  -- --- contact_status ---
  alter table public.contact_status add column if not exists project_id bigint;
  update public.contact_status set project_id = digihack_id where project_id is null;
  alter table public.contact_status alter column project_id set not null;
  alter table public.contact_status drop constraint if exists contact_status_project_id_fkey;
  alter table public.contact_status add constraint contact_status_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete restrict;

  -- --- emails ---
  alter table public.emails add column if not exists project_id bigint;
  update public.emails set project_id = digihack_id where project_id is null;
  alter table public.emails alter column project_id set not null;
  alter table public.emails drop constraint if exists emails_project_id_fkey;
  alter table public.emails add constraint emails_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete restrict;

  -- --- email_templates ---
  alter table public.email_templates add column if not exists project_id bigint;
  update public.email_templates set project_id = digihack_id where project_id is null;
  alter table public.email_templates alter column project_id set not null;
  alter table public.email_templates drop constraint if exists email_templates_project_id_fkey;
  alter table public.email_templates add constraint email_templates_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade;

  -- --- attachment_templates ---
  alter table public.attachment_templates add column if not exists project_id bigint;
  update public.attachment_templates set project_id = digihack_id where project_id is null;
  alter table public.attachment_templates alter column project_id set not null;
  alter table public.attachment_templates drop constraint if exists attachment_templates_project_id_fkey;
  alter table public.attachment_templates add constraint attachment_templates_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade;
end $$;

-- ============================================================
-- 3) Jedan izvršilac po kontaktu — ali po projektu
-- ============================================================
-- Isti kontakt sme da ima različite izvršioce na DigiHack-u i GreenTour-u,
-- pa jedinstvenost više nije samo po contact_id.
--
-- Svako jedinstveno ograničenje ili indeks NAD SAMO contact_id (u
-- assignments ili contact_status) bi i dalje branio drugi red za isti kontakt
-- na drugom projektu — otud ovaj prolaz, koji ih nalazi bez obzira na to kako
-- su nazvani i da li iza njih stoji ograničenje ili goli indeks.
do $$
declare
  target text;
  contact_attnum smallint;
  rec record;
begin
  foreach target in array array['assignments', 'contact_status'] loop
    select attnum into contact_attnum
      from pg_attribute
      where attrelid = format('public.%I', target)::regclass
        and attname = 'contact_id';

    for rec in
      select c.conname as name, true as is_constraint
        from pg_constraint c
        where c.conrelid = format('public.%I', target)::regclass
          and c.contype = 'u'
          and c.conkey = array[contact_attnum]
      union all
      select i.relname, false
        from pg_index x
        join pg_class i on i.oid = x.indexrelid
        where x.indrelid = format('public.%I', target)::regclass
          and x.indisunique
          and x.indnatts = 1
          and x.indkey[0] = contact_attnum
          and not exists (
            select 1 from pg_constraint c where c.conindid = x.indexrelid
          )
    loop
      if rec.is_constraint then
        execute format(
          'alter table public.%I drop constraint %I', target, rec.name
        );
      else
        execute format('drop index public.%I', rec.name);
      end if;
    end loop;
  end loop;
end $$;

-- Kolone su namerno u redosledu (contact_id, project_id): tako isti indeks
-- služi i brisanju kontakta, koje ide kroz sve projekte odjednom.
create unique index if not exists assignments_contact_project_key
  on public.assignments (contact_id, project_id);

-- ============================================================
-- 4) Indeksi za upite koje aplikacija sada radi po projektu
-- ============================================================
create index if not exists assignments_project_user_idx
  on public.assignments (project_id, user_id);

create index if not exists interactions_project_user_created_idx
  on public.interactions (project_id, user_id, created_at desc);

create index if not exists interactions_project_contact_created_idx
  on public.interactions (project_id, contact_id, created_at desc);

create index if not exists contact_status_project_contact_idx
  on public.contact_status (project_id, contact_id, updated_at desc);

create index if not exists emails_project_user_created_idx
  on public.emails (project_id, user_id, created_at desc);

create index if not exists emails_project_contact_idx
  on public.emails (project_id, contact_id);

create index if not exists emails_project_sent_user_idx
  on public.emails (project_id, user_id, sent_at desc) where status = 'sent';

create index if not exists email_templates_project_idx
  on public.email_templates (project_id, name);

create index if not exists attachment_templates_project_idx
  on public.attachment_templates (project_id, name);

-- Zamenjeni novim indeksima iz ovog odeljka (isti upiti, sada uz project_id).
drop index if exists public.assignments_user_id_idx;
drop index if exists public.interactions_user_created_idx;
drop index if exists public.interactions_contact_created_idx;
drop index if exists public.emails_user_created_idx;
drop index if exists public.emails_sent_user_idx;

-- Namerno ostaju indeksi koji se koriste KROZ sve projekte: emails_due_idx
-- (cron traži dospele mejlove), interactions_contact_id_idx i
-- contact_status_contact_id_idx (brisanje kontakta briše mu istoriju na svim
-- projektima) i emails_contact_id_idx (kaskadno brisanje mejlova kontakta).
-- Novi indeksi imaju project_id na prvom mestu, pa ove upite ne pokrivaju.

-- Provera:
--   select id, slug, name, archived from public.projects order by created_at;
--   -- svi postojeći redovi treba da nose DigiHack:
--   select project_id, count(*) from public.interactions group by project_id;
--   select project_id, count(*) from public.contact_status group by project_id;
--   select project_id, count(*) from public.assignments group by project_id;
--   select project_id, count(*) from public.emails group by project_id;
