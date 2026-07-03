import { createClient } from "@/lib/supabase/server"

export default async function ContactsPage() {
  const supabase = createClient()

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*, contact_status(communication_status, interest_tag, updated_at)")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-500">
          Greška pri učitavanju kontakata: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Kontakti</h1>

      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-foreground/5 text-foreground/60">
            <tr>
              <th className="px-4 py-2 font-medium">Ime</th>
              <th className="px-4 py-2 font-medium">Firma</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Telefon</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contacts?.map((contact) => {
              const status = Array.isArray(contact.contact_status)
                ? contact.contact_status[0]
                : contact.contact_status

              return (
                <tr key={contact.id} className="border-t border-foreground/10">
                  <td className="px-4 py-2 text-foreground">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="px-4 py-2 text-foreground/70">
                    {contact.company ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground/70">
                    {contact.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground/70">
                    {contact.phone ?? contact.mobile_phone ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground/70">
                    {status?.communication_status ?? "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {contacts?.length === 0 && (
          <p className="px-4 py-6 text-sm text-foreground/50">
            Nema unetih kontakata.
          </p>
        )}
      </div>
    </div>
  )
}
