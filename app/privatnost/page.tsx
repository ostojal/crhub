import { APP_NAME, SUPPORT_EMAIL } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

// Javno dostupna stranica — na nju upućuje Privacy policy URL u Google
// OAuth consent screen-u, pa ne sme biti iza prijave.
export const metadata: Metadata = {
  title: `Politika privatnosti — ${APP_NAME}`,
  description: `Kako ${APP_NAME} koristi i čuva podatke, uključujući podatke sa Google naloga.`,
  robots: { index: true, follow: true },
};

const UPDATED_AT = "25. jul 2026.";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link
        href="/"
        className="text-sm text-foreground/60 underline-offset-4 hover:underline"
      >
        ← {APP_NAME}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-foreground">
        Politika privatnosti
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        Poslednja izmena: {UPDATED_AT}
      </p>

      <div className="mt-8 space-y-8 text-sm text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            1. O aplikaciji
          </h2>
          <p>
            {APP_NAME} je interni CRM alat kojim jedan tim vodi poslovne
            kontakte, raspoređuje ih među članovima tima, evidentira
            kontaktiranja i šalje mejlove. Aplikacija nije javni servis: nalog
            se ne otvara samostalno, već ga administrator unapred odobrava.
          </p>
          <p>
            Za sva pitanja o podacima piši na{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline underline-offset-4"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            2. Koje podatke čuvamo
          </h2>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <span className="font-medium text-foreground">
                Podaci o korisnicima aplikacije:
              </span>{" "}
              ime, email adresa i profilna slika sa Google naloga kojim se
              korisnik prijavljuje, kao i uloga koju mu je dodelio
              administrator.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Podaci o poslovnim kontaktima:
              </span>{" "}
              naziv firme, ime i prezime, pozicija, email, telefon, grad i
              beleške — podaci koje tim sam unosi radi poslovne saradnje.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Evidencija rada:
              </span>{" "}
              zapisi o kontaktiranjima (tip, vreme, beleška), status saradnje sa
              kontaktom i podaci o dodeli kontakata članovima tima.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Mejlovi poslati iz aplikacije:
              </span>{" "}
              primalac, CC/BCC, naslov, tekst, izabrani prilozi, vreme slanja i
              status slanja.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            3. Podaci sa Google naloga
          </h2>
          <p>Aplikacija koristi Google naloge na dva načina:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <span className="font-medium text-foreground">Prijava</span> —
              koriste se osnovni podaci profila (ime, email adresa, profilna
              slika) da bi se korisnik prepoznao i povezao sa ulogom koju mu je
              dao administrator.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Slanje mejlova
              </span>{" "}
              — uz dozvolu{" "}
              <code className="rounded bg-foreground/5 px-1 py-0.5 text-xs">
                https://www.googleapis.com/auth/gmail.send
              </code>{" "}
              aplikacija šalje isključivo one mejlove koje korisnik sam sastavi
              i pošalje ili zakaže u aplikaciji, sa njegove adrese.
            </li>
          </ul>
          <p>
            {APP_NAME} <span className="font-medium">ne čita</span>,{" "}
            <span className="font-medium">ne pretražuje</span>,{" "}
            <span className="font-medium">ne menja</span> i{" "}
            <span className="font-medium">ne briše</span> poruke iz Gmail
            sandučeta, niti pristupa kontaktima, kalendaru ili fajlovima sa
            Google naloga.
          </p>
          <p>
            Da bi zakazani mejl mogao da bude poslat i kada korisnik nije
            prijavljen, aplikacija čuva Google „refresh token” tog korisnika.
            Token se u bazi čuva šifrovan (AES-256-GCM) i koristi se isključivo
            za slanje opisanih mejlova.
          </p>
          <p>
            Povezivanje Gmail naloga je dobrovoljno i prekida se u svakom
            trenutku — u samoj aplikaciji (stranica „Mejlovi” → „Prekini vezu”)
            ili na{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            . Prekidom veze aplikacija briše sačuvani token.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            4. Limited Use
          </h2>
          <p>
            Korišćenje i prenos podataka dobijenih preko Google API-ja u
            aplikaciji {APP_NAME} u skladu je sa{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , uključujući i zahteve iz odeljka Limited Use.
          </p>
          <p className="text-foreground/70 italic">
            {APP_NAME}&apos;s use and transfer of information received from
            Google APIs to any other app will adhere to the Google API Services
            User Data Policy, including the Limited Use requirements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            5. Gde se podaci čuvaju i sa kim se dele
          </h2>
          <p>
            Podaci se čuvaju u bazi kod pružaoca usluge Supabase, a aplikacija
            je hostovana na Vercelu. Ti pružaoci obrađuju podatke isključivo u
            ulozi tehničke infrastrukture. Mejlovi se šalju preko Gmail API-ja.
          </p>
          <p>
            Podatke ne prodajemo, ne ustupamo trećim licima za reklamiranje i ne
            koristimo za treniranje modela veštačke inteligencije. Pristup
            podacima unutar aplikacije imaju samo članovi tima kojima je
            administrator dodelio ulogu, i to u obimu koji ta uloga dozvoljava.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            6. Zadržavanje i brisanje podataka
          </h2>
          <p>
            Podaci se čuvaju dok su potrebni za rad tima. Administrator u svakom
            trenutku može da obriše kontakt (zajedno sa njegovom istorijom
            kontaktiranja) ili korisnički nalog. Za brisanje svojih podataka
            javi se na{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline underline-offset-4"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            i podaci će biti uklonjeni.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            7. Izmene politike
          </h2>
          <p>
            Ako se ova politika izmeni, nova verzija se objavljuje na ovoj
            stranici sa novim datumom poslednje izmene.
          </p>
        </section>
      </div>
    </main>
  );
}
