import { FdLogo } from "@/components/fd-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORT_EMAIL } from "@/lib/constants";
import Link from "next/link";

// Javna stranica: jedino što neprijavljen posetilac (uključujući Google-ovog
// recenzenta u OAuth verifikaciji) vidi na "/". Zato ovde stoji tačno ime
// aplikacije sa OAuth consent screen-a i opis čemu služi, uključujući to
// kako se koriste podaci sa Google naloga.
const FEATURES = [
  {
    title: "Baza poslovnih kontakata",
    description:
      "Firme i osobe sa kojima tim sarađuje — pozicija, email, telefon, grad i beleške na jednom mestu.",
  },
  {
    title: "Dodela kontakata",
    description:
      "Administrator dodeljuje kontakte članovima tima, tako da svako vidi samo one za koje je zadužen.",
  },
  {
    title: "Evidencija kontaktiranja",
    description:
      "Svako kontaktiranje (mejl, poziv, LinkedIn) se beleži zajedno sa ishodom i statusom saradnje.",
  },
  {
    title: "Slanje mejlova iz aplikacije",
    description:
      "Član tima sastavlja mejl po šablonu i šalje ga sa sopstvenog Gmail naloga, odmah ili zakazano.",
  },
  {
    title: "Analitika",
    description:
      "Pregled aktivnosti po članu tima: koliko je kontakata obrađeno, koliko kontaktiranja i sa kakvim ishodom.",
  },
];

export function Landing() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <header className="flex flex-col items-center text-center">
        <div className="grid size-16 place-items-center">
          <FdLogo width={96} height={96} />
        </div>

        <h1 className="mt-4 font-heading text-3xl font-semibold text-foreground">
          CR HUB
        </h1>

        <p className="mt-3 max-w-xl text-foreground/70">
          Interni CRM alat za vođenje poslovnih kontakata, raspodelu posla u
          timu i komunikaciju sa kontaktima — uključujući slanje mejlova
          direktno iz aplikacije.
        </p>

        <div className="mt-6">
          <Button asChild>
            <Link href="/login">Prijavi se</Link>
          </Button>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-foreground">
          Čemu služi aplikacija
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          CR HUB koristi jedan tim za organizovan rad sa poslovnim kontaktima.
          Umesto tabela i razbacanih beleški, kontakti stoje u zajedničkoj bazi,
          dodeljuju se članovima tima, a svaka komunikacija sa kontaktom se
          evidentira i meri.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/70">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-foreground">
          Ko može da koristi CR HUB
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          Aplikacija nije javni servis i nema samostalne registracije. Pristup
          dobijaju isključivo članovi tima kojima administrator unapred odobri
          nalog. Prijava ide Google nalogom; osoba bez odobrene uloge ne vidi
          nikakve podatke.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-foreground">
          Povezivanje sa Gmail nalogom
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          Da bi mejl koji član tima sastavi u aplikaciji stigao sa njegove
          adrese, aplikacija traži dozvolu{" "}
          <code className="rounded bg-foreground/5 px-1 py-0.5 text-xs">
            gmail.send
          </code>
          . Ta dozvola služi isključivo za slanje mejlova koje korisnik sam
          sastavi i pošalje ili zakaže u aplikaciji.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-foreground/70">
          <li>
            CR HUB ne čita, ne pretražuje, ne menja i ne briše poruke iz Gmail
            sandučeta.
          </li>
          <li>
            Povezivanje je dobrovoljno; bez njega aplikacija radi, samo se
            mejlovi ne šalju iz nje.
          </li>
          <li>
            Veza se u svakom trenutku prekida u samoj aplikaciji ili na{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            .
          </li>
        </ul>

        <p className="mt-3 text-sm text-foreground/70">
          Detalji o podacima su u{" "}
          <Link
            href="/privatnost"
            className="underline underline-offset-4 hover:text-foreground"
          >
            politici privatnosti
          </Link>
          .
        </p>
      </section>

      {/* Kratak opis na engleskom da recenzent Google-ove verifikacije ne
          zavisi od prevoda stranice */}
      <section className="mt-12 border-t border-foreground/10 pt-8">
        <h2 className="text-lg font-semibold text-foreground">
          About CR HUB (English)
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          CR HUB is an internal CRM application used by a single team to manage
          business contacts, assign those contacts to team members, log every
          outreach attempt and its outcome, and send outreach emails directly
          from the app. Access is invite-only: an administrator must approve an
          account before it can see any data, and there is no public sign-up.
        </p>
        <p className="mt-3 text-sm text-foreground/70">
          The app requests the{" "}
          <code className="rounded bg-foreground/5 px-1 py-0.5 text-xs">
            gmail.send
          </code>{" "}
          scope for one purpose only: to send the email a signed-in user has
          composed in the app, from that user&apos;s own Gmail account, either
          immediately or at a scheduled time. CR HUB never reads, searches,
          modifies or deletes messages in the user&apos;s mailbox. Connecting a
          Gmail account is optional and can be revoked at any time from within
          the app or from the Google account permissions page.
        </p>
      </section>

      <footer className="mt-12 flex flex-col gap-2 border-t border-foreground/10 pt-6 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <span>CR HUB — interni alat, pristup samo uz odobrenje.</span>
        <span className="flex gap-4">
          <Link
            href="/privatnost"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Politika privatnosti
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {SUPPORT_EMAIL}
          </a>
        </span>
      </footer>
    </main>
  );
}
