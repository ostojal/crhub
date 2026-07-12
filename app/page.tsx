import { auth } from "@/auth";
import { PendingAccess } from "@/components/pending-access";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { getCurrentUser } from "@/lib/dal";
import { NAV_LINKS } from "@/lib/nav";
import Link from "next/link";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    const session = await auth();

    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <PendingAccess email={session?.user?.email ?? ""} />
      </div>
    );
  }

  const links = NAV_LINKS[user.role];
  const firstName = user.fullName?.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">
        Zdravo{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        Uloga: {ROLE_LABELS[user.role]}
      </p>

      {links.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:bg-foreground/5">
                <CardHeader>
                  <CardTitle>{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-foreground/60">
          Trenutno nema stranica dostupnih za tvoju ulogu.
        </p>
      )}
    </div>
  );
}
