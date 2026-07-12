import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/validate";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Google nalog se vezuje za red u `users` preko emaila; nepoznati nalozi
    // dobijaju red bez uloge ("na čekanju") i ne vide nikakve podatke dok im
    // admin ne dodeli ulogu.
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email_verified !== true) {
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email) return false;

      try {
        const supabase = createClient();
        const { data: existing } = await supabase
          .from("users")
          .select("id, full_name")
          .ilike("email", escapeLike(email))
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!existing) {
          // role: null eksplicitno — kolona ima default '', a oba znače
          // "na čekanju"; null je kanonski oblik
          await supabase
            .from("users")
            .insert({ email, full_name: user.name ?? null, role: null });
        } else if (!existing.full_name && user.name) {
          await supabase
            .from("users")
            .update({ full_name: user.name })
            .eq("id", existing.id);
        }
      } catch {
        // Prijava ne sme da padne zbog ovoga — pristup ionako kontroliše DAL
      }

      return true;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
