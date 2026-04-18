import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          CRHub
        </h1>
        <p className="text-sm text-foreground/60">
          Ulogovan kao {session?.user?.email}
        </p>
      </div>
    </div>
  );
}
