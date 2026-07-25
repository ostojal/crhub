-- CRHub mejlovi, dopuna — pokreni u Supabase SQL editoru POSLE db/emails.sql.
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).
--
-- Donosi: potpis po korisniku i veći limit za priloge (10MB).

-- 1) Potpis koji se automatski dodaje na kraj mejla (kao potpis u Gmailu).
--    Korisnik ga uređuje na stranici /mejlovi.
alter table public.users
  add column if not exists email_signature text;

-- 2) Prilozi do 10MB. Fajl ide iz pretraživača pravo u Storage (potpisani
--    upload), pa Vercelov limit tela requesta od 4.5MB više nije prepreka.
update storage.buckets
  set file_size_limit = 10485760
  where id = 'email-attachments';
