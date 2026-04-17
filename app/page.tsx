import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          CRHub
        </h1>
        <p className="text-sm text-foreground/60">
          Ulogovan kao {session?.user?.email}
        </p>
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-foreground/10 bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
          >
            Odjavi se
          </button>
        </form>
      </div>
    </div>
  );
}
