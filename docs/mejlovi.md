# Slanje mejlova iz aplikacije (Gmail API)

Korisnik otvara kompozer sa dugmeta **Kontaktiraj**, bira šablon za naslov i
telo, CC/BCC sa liste koju održava admin i priloge koje je admin otpremio.
Mejl ide sa njegovog Gmail naloga — odmah ili zakazano — i automatski se
evidentira kao kontaktiranje, pa ga postojeća analitika hvata bez izmena.

Ručno evidentiranje (pozivi, LinkedIn, mejlovi poslati van aplikacije) ostaje
kao sekundarno dugme **Evidentiraj**.

## 1. Google Cloud

Sve se radi u **istom projektu** u kom već postoji OAuth klijent za prijavu.

1. **Uključi Gmail API**
   APIs & Services → Library → _Gmail API_ → **Enable**.
   Ništa drugo se ne uključuje — bez service account-a, bez Pub/Sub-a.

2. **OAuth consent screen**
   - Dodaj scope `https://www.googleapis.com/auth/gmail.send` (Google ga
     označava kao _sensitive_).
   - **Objavi aplikaciju u Production** (dugme _Publish app_).
     ⚠️ Ovo je važno: u _Testing_ modu Google gasi refresh tokene posle 7 dana,
     pa bi svima veza pucala jednom nedeljno.
   - Pošto aplikacija nije prošla Google verifikaciju, pri povezivanju naloga
     se javlja ekran „Google hasn't verified this app” → _Advanced_ →
     _Go to … (unsafe)_. To je očekivano i bezbedno za interni tim
     (ograničenje neverifikovanih aplikacija je 100 korisnika).

3. **Credentials → postojeći OAuth 2.0 Client ID**
   U _Authorized redirect URIs_ dodaj:

   ```
   http://localhost:3000/api/google/callback
   https://<prod-domen>/api/google/callback
   ```

   Postojeći `…/api/auth/callback/google` (prijava) ostaje netaknut — tok
   prijave se ne menja.

4. **Ako tražiš verifikaciju aplikacije** (Google to traži za _sensitive_
   scope kad se aplikacija objavi), u _Branding_ / _OAuth consent screen_
   podesi:
   - _App name_: **CR HUB** — mora se poklapati sa imenom na stranici
     (`APP_NAME` u `lib/constants.ts`).
   - _Application home page_: `https://<prod-domen>/`
   - _Application privacy policy link_: `https://<prod-domen>/privatnost`

   Obe stranice su namerno **javne** (vidi `PUBLIC_PATHS` u `proxy.ts`) —
   Google-ov recenzent nije prijavljen, pa bi iza prijave video samo ekran za
   login i odbio verifikaciju. Domen još treba potvrditi u Google Search
   Console-u pod istim nalogom.

## 2. Supabase

U SQL editoru pokreni redom:

1. `db/emails.sql` — tabele (`google_tokens`, `email_templates`,
   `attachment_templates`, `cc_bcc_options`, `emails`) i privatni Storage
   bucket `email-attachments`.
2. `db/emails-v2.sql` — potpis po korisniku (`users.email_signature`) i limit
   priloga podignut na 10MB.
3. `db/email-cron.sql` — cron koji svakog minuta poziva aplikaciju da pošalje
   dospele zakazane mejlove. **Pre pokretanja zameni** `YOUR_APP_URL` i
   `YOUR_CRON_SECRET` u fajlu. Pokreni tek kad je aplikacija deployovana.
4. `db/follow-up.sql` — statusi za follow up i tabela `app_settings`. Fajl ima
   dva odeljka koja se pokreću **odvojeno**: prvo dva `alter type`, pa tek onda
   ostatak. Postgres ne dozvoljava da se nova vrednost enuma upotrebi u istoj
   transakciji u kojoj je dodata.

Sve skripte su idempotentne.

## 3. Env varovi

Uz postojeće, dodaj (lokalno u `.env.local`, na Vercelu u Project Settings →
Environment Variables):

| Var                    | Šta je                                            | Kako se pravi                                          |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `APP_URL`              | osnovni URL aplikacije, bez kose crte na kraju    | `http://localhost:3000` lokalno, prod domen na Vercelu |
| `GOOGLE_TOKEN_ENC_KEY` | ključ kojim se šifruje Gmail refresh token u bazi | `openssl rand -base64 32`                              |
| `CRON_SECRET`          | tajna kojom se štiti `/api/emails/process`        | `openssl rand -hex 32`                                 |

`GOOGLE_TOKEN_ENC_KEY` mora biti isti u svim okruženjima koja dele bazu —
promena ključa čini postojeće tokene nečitljivim i svi moraju ponovo da povežu
nalog.

## 4. Kako se koristi

- **Admin** na `/admin/mejlovi` pravi šablone, otprema priloge (do 10 MB po
  fajlu) i dodaje CC/BCC adrese. U naslovu i telu šablona mogu da stoje
  podaci kontakta — `{{ime}}`, `{{prezime}}`, `{{firma}}`, `{{pozicija}}`,
  `{{grad}}` — i podaci pošiljaoca: `{{moje_ime}}`, `{{moje_prezime}}`,
  `{{moje_ime_i_prezime}}`, `{{moj_email}}`.
- **Svaki korisnik** na `/mejlovi` jednom klikne _Poveži Gmail_. Povezuje se
  isključivo nalog sa kojim je prijavljen u aplikaciju — drugi Google nalog
  aplikacija odbija. Tu se podešava i **potpis**, koji se pri otvaranju
  kompozera automatski dodaje na kraj poruke (kao potpis u Gmailu) i može se
  izmeniti za pojedinačni mejl.
- Mejl odlazi kao „Ime Prezime &lt;adresa&gt;" — ime se uzima sa Google naloga
  korisnika (`users.full_name`).
- Telo mejla, šabloni i potpis se pišu u editoru sa formatiranjem (podebljano,
  kurziv, podvučeno, veličina fonta, liste, linkovi, slike). Slika se nalepi
  (Ctrl+V) ili ubaci dugmetom; najviše 1 MB po slici, jer telo poruke putuje
  kroz server akciju koju Vercel ograničava na 4.5 MB.
- Poruka se šalje kao `multipart/alternative` (HTML + čist tekst za klijente
  bez HTML-a); slike iz teksta postaju `cid:` delovi poruke, jer mejl klijenti
  blokiraju `data:` slike. Stariji šabloni pisani kao čist tekst i dalje rade —
  prelomi redova se pretvaraju u `<br>` pri otvaranju.
- Kompozer se otvara sa **Kontaktiraj** na strani kontakta, u _Mojim
  kontaktima_ (red i mobilna kartica) i iz menija u admin tabeli kontakata.
- Poslati i zakazani mejlovi se vide na `/mejlovi`; zakazani se mogu otkazati
  dok ih cron ne preuzme.

Po uspešnom slanju upisuje se interakcija tipa _Email_, a status kontakta se
pomera za jedan stepenik naviše — nikad unazad:

| status pre slanja                  | status posle slanja |
| ---------------------------------- | ------------------- |
| prazno / „Nije kontaktiran”        | „Poslato”           |
| „Poslato” / „Poslati follow up”    | „Poslat follow up”  |
| „Dobijen odgovor”, „Prihvaćeno”, … | ne menja se         |

## 5. Follow up

Kad prođe zadati broj **radnih dana** od poslednjeg kontaktiranja, a odgovor
nije evidentiran, kontakt izlazi korisniku na `/mejlovi` u sekciji **Za follow
up** i dobija status „Poslati follow up”. Status upisuje isti cron koji šalje
zakazane mejlove (`/api/emails/process`) — nema drugog cron posla.

Kontaktiranje je i mejl poslat iz aplikacije i ručno evidentiranje preko
**Evidentiraj**; meri se ono što je novije. Ručni unosi se računaju tek od
`MANUAL_ANCHOR_SINCE` u `lib/follow-up.ts` (datum uvođenja podsetnika) —
istorija starija od toga se namerno ne budi, inače bi svima odjednom iskočile
desetine kontakata kontaktiranih pre nego što je tok postojao.

Radni dani su **ponedeljak–četvrtak**; petak, subota i nedelja se ne broje jer
se tada ne šalju mejlovi. Računa se po beogradskom vremenu, ne po UTC-u.
Spisak dana je konstanta u `lib/follow-up.ts`; broj dana i uključenost
podsetnika admin podešava na `/admin/mejlovi`.

Sledeći koraci:

- **Pošalji follow up** otvara kompozer; po slanju status sam prelazi u „Poslat
  follow up” i kontakt nestaje iz sekcije.
- Ako ni tada nema odgovora, posle zadatog broja radnih dana kontakt izlazi u
  sekciji **Za poziv**. Nestaje čim se evidentira interakcija tipa _Poziv_.
- **Dobijen odgovor** u obe sekcije postavlja taj status i sklanja kontakt.

Aplikacija **ne čita Gmail sanduče** — traži se samo dozvola `gmail.send`.
Odgovor se zato evidentira ručno. Automatska detekcija bi tražila
`gmail.readonly`, `thread_id` kolonu na `emails` i ponovnu Google verifikaciju
(restricted scope).

## 6. Provera i rešavanje problema

Ručno pokretanje obrade zakazanih mejlova (bez čekanja cron-a):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/emails/process
# → {"sent":1,"failed":0,"skipped":0,"swept":0,"promoted":0}
# promoted = kontakti kojima je upisan status "Poslati follow up"
```

U Supabase-u:

```sql
select jobname, schedule, active from cron.job;                     -- posao postoji?
select id, status_code, content, created                            -- 200 = ok, 401 = pogrešna tajna
  from net._http_response order by id desc limit 5;
select id, status, error, scheduled_at from public.emails           -- stanje outbox-a
  order by id desc limit 20;
```

Česti slučajevi:

- **„Gmail veza je istekla”** — korisnik je opozvao pristup ili je aplikacija
  ostala u _Testing_ modu. Veza se označi kao neispravna, a korisnik na
  `/mejlovi` dobija poziv da poveže nalog ponovo.
- **Mejl u statusu „Neuspešan”** — razlog piše uz sam mejl. Nema automatskog
  ponavljanja; mejl se sastavlja ponovo (svesna odluka, da se ne bi desilo
  dvostruko slanje).
- **Zakazani mejl kasni** — cron radi u minutnom ritmu, pa je odstupanje do
  ~1 minut normalno.
