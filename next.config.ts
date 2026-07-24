import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Admin uploaduje priloge kroz server akciju; default je 1MB, a bucket
    // dozvoljava fajlove do 4MB (vidi MAX_ATTACHMENT_BYTES)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
