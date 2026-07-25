-- CRHub kategorije partnera — pokreni u Supabase SQL editoru.
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).
--
-- Kontakt pripada najviše jednoj kategoriji; NULL znači "bez kategorije".

alter table public.contacts
  add column if not exists category text;

-- Prazan string se tretira kao "bez kategorije" (ostale tekst kolone u ovoj
-- tabeli imaju default '', pa se izjednačava sa NULL)
update public.contacts set category = null where category = '';

alter table public.contacts drop constraint if exists contacts_category_check;
alter table public.contacts add constraint contacts_category_check
  check (category is null or category in ('finansijski', 'naturalni', 'nagradni'));

create index if not exists contacts_category_idx
  on public.contacts (category);
