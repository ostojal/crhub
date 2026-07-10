import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 font-heading text-5xl font-extrabold">404</h1>
      <h2 className="mb-2 font-heading text-2xl font-semibold">
        Stranica nije pronađena
      </h2>
      <p className="mb-6 text-muted-foreground">
        Vratite se na početnu stranicu ili kontaktirajte admina.
      </p>
      <Link
        href="/"
        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Vrati se na početnu stranicu
      </Link>
    </main>
  );
}
