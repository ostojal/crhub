import type { MetadataRoute } from "next";

// Sam alat ostaje van pretrage, ali javna početna i politika privatnosti
// moraju biti dostupne (uslov Google-ove OAuth verifikacije)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/privatnost"],
      disallow: "/",
    },
  };
}
