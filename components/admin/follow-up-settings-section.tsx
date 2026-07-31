"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFollowUpSettings } from "@/lib/actions/email-admin";
import { MAX_FOLLOW_UP_DAYS, MIN_FOLLOW_UP_DAYS } from "@/lib/constants";
import type { FollowUpSettings } from "@/lib/follow-up";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// Uključivanje i učestalost automatskih podsetnika. Same dane u nedelji ne
// podešava — mejlovi se po dogovoru ne šalju petkom, subotom ni nedeljom, pa
// je taj spisak konstanta u lib/follow-up.ts.
export function FollowUpSettingsSection({
  settings,
}: {
  settings: FollowUpSettings;
}) {
  const [value, setValue] = useState(settings);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateFollowUpSettings(value);

      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  const dayInput = (
    id: string,
    label: string,
    current: number,
    onChange: (days: number) => void,
    disabled: boolean,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={MIN_FOLLOW_UP_DAYS}
        max={MAX_FOLLOW_UP_DAYS}
        value={current}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-24"
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Podsetnici za follow up</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Kad prođe zadati broj radnih dana od poslatog mejla, a odgovor nije
          evidentiran, kontakt se pojavljuje korisniku na stranici Mejlovi i
          dobija status „Poslati follow up”. Petak, subota i nedelja se ne
          računaju jer se tada ne šalju mejlovi.
        </p>

        <div className="space-y-3 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={value.followUpEnabled}
              onCheckedChange={(checked) =>
                setValue({ ...value, followUpEnabled: checked === true })
              }
            />
            Podsetnik za follow up
          </label>

          {dayInput(
            "follow-up-days",
            "Radnih dana posle mejla",
            value.followUpDays,
            (followUpDays) => setValue({ ...value, followUpDays }),
            !value.followUpEnabled,
          )}
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={value.callReminderEnabled}
              onCheckedChange={(checked) =>
                setValue({ ...value, callReminderEnabled: checked === true })
              }
            />
            Podsetnik za poziv telefonom
          </label>

          <p className="text-sm text-muted-foreground">
            Izlazi kad ni na follow up nije stigao odgovor. Nestaje čim se
            evidentira poziv.
          </p>

          {dayInput(
            "call-reminder-days",
            "Radnih dana posle follow up-a",
            value.callReminderDays,
            (callReminderDays) => setValue({ ...value, callReminderDays }),
            !value.callReminderEnabled,
          )}
        </div>

        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Čuvanje…" : "Sačuvaj podešavanja"}
        </Button>
      </CardContent>
    </Card>
  );
}
