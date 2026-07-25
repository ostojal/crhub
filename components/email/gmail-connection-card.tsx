"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectGmail } from "@/lib/actions/emails";
import { MailIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

const CALLBACK_MESSAGES: Record<
  string,
  { kind: "success" | "error"; text: string }
> = {
  connected: { kind: "success", text: "Gmail nalog je povezan." },
  mismatch: {
    kind: "error",
    text: "Izabrani Google nalog nije isti kao nalog kojim si prijavljen u aplikaciju.",
  },
  denied: {
    kind: "error",
    text: "Pristup Gmail nalogu nije odobren na Google ekranu.",
  },
  state: {
    kind: "error",
    text: "Povezivanje je predugo trajalo ili je prekinuto. Pokušaj ponovo.",
  },
  google: {
    kind: "error",
    text: "Google nije izdao dozvolu za slanje. Proveri da je pri odobravanju čekirano slanje mejlova, pa pokušaj ponovo.",
  },
  db: {
    kind: "error",
    text: "Veza je odobrena, ali nije sačuvana jer baza nije spremna. Javi administratoru.",
  },
  error: {
    kind: "error",
    text: "Povezivanje Gmail naloga nije uspelo. Pokušaj ponovo.",
  },
};

export function GmailConnectionCard({
  connection,
}: {
  connection: { google_email: string; status: string } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Ishod OAuth toka stiže kao ?gmail=... iz callback route handlera
  const result = searchParams.get("gmail");

  useEffect(() => {
    if (!result) return;

    const message = CALLBACK_MESSAGES[result];
    if (message) {
      if (message.kind === "success") toast.success(message.text);
      else toast.error(message.text);
    }

    router.replace("/mejlovi");
  }, [result, router]);

  const handleDisconnect = () => {
    startTransition(async () => {
      const response = await disconnectGmail();

      if (response.ok) {
        toast.success(response.message);
        router.refresh();
      } else {
        toast.error(response.error);
      }
    });
  };

  const isBroken = connection?.status === "broken";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gmail nalog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connection && (
          <p className="text-sm text-muted-foreground">
            Poveži svoj Gmail nalog da bi slao mejlove direktno iz aplikacije.
            Mejlovi odlaze sa tvoje adrese, a odgovori stižu u tvoje sanduče.
          </p>
        )}

        {connection && !isBroken && (
          <p className="text-sm">
            Povezan nalog:{" "}
            <span className="font-medium">{connection.google_email}</span>
          </p>
        )}

        {isBroken && (
          <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            Veza sa nalogom {connection?.google_email} više ne važi (pristup je
            opozvan ili je istekao). Poveži nalog ponovo da bi slanje radilo.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant={connection && !isBroken ? "outline" : "default"}
          >
            <Link href="/api/google/connect" prefetch={false}>
              <MailIcon data-icon="inline-start" />
              {connection ? "Poveži ponovo" : "Poveži Gmail"}
            </Link>
          </Button>

          {connection && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isPending}
            >
              Prekini vezu
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
