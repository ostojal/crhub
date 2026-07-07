import { auth, signOut } from "@/auth"

export default async function Navbar() {
  const session = await auth()

  if (!session?.user) return null

  const { name, email, image } = session.user
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          CRHub
        </span>

        <div className="flex items-center gap-3">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name ?? email ?? "User"}
              width={32}
              height={32}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full border border-foreground/10"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-xs font-medium text-foreground">
              {initial}
            </div>
          )}

          <span className="hidden text-sm text-foreground/70 sm:inline">
            {name ?? email}
          </span>

          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              Odjavi se
            </button>
          </form>
        </div>
      </nav>
    </header>
  )
}
