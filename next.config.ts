import type { NextConfig } from "next";

// Prilozi ne prolaze kroz server akcije (idu potpisanim uploadom pravo u
// Supabase Storage), pa podrazumevani limit tela requesta ostaje netaknut
const nextConfig: NextConfig = {
  experimental: {
    // Sve strane su dinamičke, pa se podrazumevano svaki povratak na već
    // viđenu stranu ponovo dohvata sa servera (~200ms čekanja na bazu).
    // Kratko pamćenje u pretraživaču čini kretanje kroz aplikaciju trenutnim;
    // izmene se i dalje vide odmah jer server akcije zovu revalidatePath.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
