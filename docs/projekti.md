# Projekti (DigiHack, GreenTour, …)

Isti partneri se kontaktiraju za više projekata, a svaki projekat kreće od
nule. Zato je baza podeljena na dva sloja:

| Zajedničko za sve projekte                         | Pripada jednom projektu                     |
| -------------------------------------------------- | ------------------------------------------- |
| `contacts` (firma, ime, mejl, telefon, grad)       | `assignments` — kome je kontakt dodeljen    |
| `users` i uloge                                    | `contact_status` — status i oznaka interesa |
| `google_tokens` i potpis (`users.email_signature`) | `interactions` — istorija kontaktiranja     |
| `cc_bcc_options` — interne CC/BCC adrese           | `emails` — poslati i zakazani mejlovi       |
| `app_settings` — rokovi za follow up               | `email_templates` i `attachment_templates`  |

Kontakt se dakle unosi jednom, a na DigiHack-u može biti „Prihvaćeno" dok je
na GreenTour-u „Nije kontaktiran", sa različitim izvršiocem u svakom projektu.

## Pokretanje

U Supabase SQL editoru pokreni `db/projects.sql` (posle `db/emails.sql`,
`db/follow-up.sql` i `db/rbac.sql`). Skripta:

1. pravi tabelu `public.projects` i u nju upisuje **DigiHack** i **GreenTour**;
2. dodaje `project_id` na tabele iz desne kolone i **sve postojeće redove
   pripisuje DigiHack-u**;
3. menja jedinstvenost dodela sa „jedan izvršilac po kontaktu" na „jedan
   izvršilac po kontaktu i projektu".

Skripta je idempotentna. Posle nje GreenTour je prazan: bez dodela, bez
statusa, bez istorije i bez mejl šablona.

## Rad u aplikaciji

- Projekat na kom se radi bira se u **zaglavlju**, desno od naloga. Izbor se
  pamti u kolačiću (`crhub_project`) godinu dana, po korisniku i pretraživaču.
- Sve stranice — kontakti, moji kontakti, strana firme, mejlovi, analitika —
  prikazuju isključivo aktivan projekat. Isto važi za svaki upis: dodela,
  evidentirano kontaktiranje ili poslat mejl uvek pripada projektu na kom se
  radilo.
- **Admin → Projekti** (`/admin/projekti`) služi za dodavanje novog projekta,
  preimenovanje, arhiviranje i brisanje. Prikazuje i koliko je na kom
  projektu upisano dodela, kontaktiranja i mejlova.
- **Više projekata teče uporedo.** Posle `db/projects.sql` i DigiHack i
  GreenTour su aktivni: oba stoje u biraču, follow up radi na oba, i prelazak
  s jednog na drugi je samo izbor u zaglavlju. Ništa se ne arhivira samo od
  sebe.
- **Arhiviranje** je za projekat koji je završen: sklanja ga iz birača i cron
  za follow up ga preskače, ali sva istorija ostaje i vraćanje u rad je jedan
  klik. **Brisanje** je moguće samo dok je projekat potpuno prazan — baza to
  dodatno brani stranim ključem.

## Šta ostaje zajedničko i zašto

- **Kontakti** — isti ljudi, ista firma; dupliranje bi značilo da se ispravka
  telefona unosi dvaput.
- **CC/BCC adrese i Gmail veza** — vezane su za tim i za nalog, ne za projekat.
- **Rokovi za follow up** (`app_settings`) — jedno pravilo za ceo tim; cron ih
  primenjuje na svaki nearhiviran projekat posebno.
- **Kategorija partnera** (finansijski / naturalni / nagradni) stoji na samom
  kontaktu, pa važi u svim projektima.
