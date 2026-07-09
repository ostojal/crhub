import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { FdLogo } from "./fd-logo";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LogOutIcon, SettingsIcon, User2Icon } from "lucide-react";
import Link from "next/link";

export default async function Navbar() {
  const session = await auth();

  if (!session?.user) return null;

  const { name, email, image } = session.user;
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/80 py-2 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center justify-center gap-4">
          <div className="grid size-10 place-items-center">
            <FdLogo width={64} height={64} />
          </div>

          <p className="font-heading font-semibold">CRHub</p>
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
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/profile" className="w-full">
                    <User2Icon />
                    <span>Profil</span>
                  </Link>
                </Button>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/settings" className="w-full">
                    <SettingsIcon />
                    <span>Podešavanja</span>
                  </Link>
                </Button>
              </DropdownMenuItem>

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
