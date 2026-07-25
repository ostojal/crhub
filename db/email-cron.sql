-- CRHub cron za zakazane mejlove — pokreni u Supabase SQL editoru NAKON
-- db/emails.sql i nakon što je aplikacija deployovana.
--
-- PRE POKRETANJA zameni:
--   YOUR_APP_URL     → npr. https://crhub.vercel.app (bez kose crte na kraju)
--   YOUR_CRON_SECRET → ista vrednost kao CRON_SECRET env var na Vercelu
--
-- Skripta je idempotentna (bezbedno je pokrenuti je više puta).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Ukloni postojeći posao ako je skripta već pokretana
select cron.unschedule('crhub-process-emails')
  where exists (select 1 from cron.job where jobname = 'crhub-process-emails');

-- Svakog minuta pozovi endpoint koji šalje dospele mejlove.
-- Poziv je "fire and forget": endpoint sam preuzima redove atomično, pa
-- preklapanje dva poziva ne može da pošalje isti mejl dvaput.
select cron.schedule(
  'crhub-process-emails',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://cr.fondigital.org/api/emails/process',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eeea8239ca2d29b69270feb552ecf27df1cc73e561034c908dd8ba031d17d1f6',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Provera da posao postoji:
--   select jobname, schedule, active from cron.job;
-- Poslednji odgovori aplikacije (status 200 = u redu, 401 = pogrešna tajna):
--   select id, status_code, content, created
--     from net._http_response order by id desc limit 5;
-- Istorija pokretanja:
--   select * from cron.job_run_details order by start_time desc limit 10;
