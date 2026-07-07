import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Roboto, Roboto_Slab } from "next/font/google";
import Navbar from "../components/navbar";
import "./globals.css";

const robotoSlabHeading = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-heading",
});

const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CRHub",
  description: "CRHub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        roboto.variable,
        robotoSlabHeading.variable,
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Navbar />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
