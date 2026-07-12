import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HourglassIcon } from "lucide-react";

export function PendingAccess({ email }: { email: string }) {
  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-foreground/5">
          <HourglassIcon className="size-5 text-foreground/60" />
        </div>
        <CardTitle>Nalog čeka odobrenje</CardTitle>
        <CardDescription>
          Prijavljen si kao <span className="font-medium">{email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/60">
          Administrator treba da ti dodeli ulogu pre nego što dobiješ pristup
          podacima. Javi se administratoru ako odobrenje traje predugo.
        </p>
      </CardContent>
    </Card>
  );
}
