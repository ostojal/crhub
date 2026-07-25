import type { NextConfig } from "next";

// Prilozi ne prolaze kroz server akcije (idu potpisanim uploadom pravo u
// Supabase Storage), pa podrazumevani limit tela requesta ostaje netaknut
const nextConfig: NextConfig = {};

export default nextConfig;
