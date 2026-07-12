import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS } from "@/lib/constants";
import { getCurrentUser } from "@/lib/dal";
import { NAV_LINKS } from "@/lib/nav";
import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { FdLogo } from "./fd-logo";
import { LinkPending } from "./link-pending";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default async function Navbar() {
  const session = await auth();

  if (!session?.user) return null;

  const user = await getCurrentUser();
  const links = user ? NAV_LINKS[user.role] : [];

  const { name, email, image } = session.user;
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/80 py-2 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center justify-center gap-4">
            <div className="grid size-10 place-items-center">
              <FdLogo width={64} height={64} />
            </div>

            <p className="font-heading font-semibold">CR HUB</p>
          </Link>

          {links.length > 0 && (
            <div className="hidden items-center gap-1 sm:flex">
              {links.map((link) => (
                <Button key={link.href} variant="ghost" size="sm" asChild>
                  <Link href={link.href}>
                    {link.label}
                    <LinkPending />
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3">
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
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-min">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : "Bez pristupa"}
              </div>

              {links.length > 0 && (
                <div className="sm:hidden">
                  <DropdownMenuSeparator />
                  {links.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        asChild
                      >
                        <Link
                          href={link.href}
                          className="flex w-full items-center"
                        >
                          <span>{link.label}</span>
                          <LinkPending />
                        </Link>
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}

              <DropdownMenuItem asChild>
                <ThemeToggle />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <DropdownMenuItem asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    type="submit"
                  >
                    <LogOutIcon />
                    <span>Odjavi se</span>
                  </Button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}
