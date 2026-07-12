// Skeleton koji Next prikaže odmah po kliku na link (preko loading.tsx), dok se
// dinamička strana renderuje na serveru — daje trenutni vizuelni feedback.
export function PageLoading({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-foreground/10" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-md border bg-foreground/5"
          />
        ))}
      </div>
    </div>
  );
}
