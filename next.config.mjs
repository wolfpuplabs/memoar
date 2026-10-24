/** @type {import('next').NextConfig} */
const nextConfig = {
  // pglite is only used for local development without a Neon database.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Fonts read from disk by the per-event share image.
  outputFileTracingIncludes: {
    "/e/[slug]/opengraph-image": ["./assets/fonts/**"],
    "/e/[slug]/twitter-image": ["./assets/fonts/**"],
  },
  // The old *.vercel.app name forwards to the new one (API routes stay put so
  // payment webhooks pointed at the old address keep working).
  async redirects() {
    return [
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "memoar-azure.vercel.app" }],
        destination: "https://memoar-by-wolfpuplabs.vercel.app/:path",
        permanent: true,
      },
    ];
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
