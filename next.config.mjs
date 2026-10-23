/** @type {import('next').NextConfig} */
const nextConfig = {
  // pglite is only used for local development without a Neon database.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Fonts read from disk by the per-event share image.
  outputFileTracingIncludes: {
    "/e/[slug]/opengraph-image": ["./assets/fonts/**"],
    "/e/[slug]/twitter-image": ["./assets/fonts/**"],
  },
  async headers() {
    return [
      {
        source: "/e/:slug/kamera",
        headers: [{ key: "Permissions-Policy", value: "camera=(self)" }],
      },
    ];
  },
};

export default nextConfig;
