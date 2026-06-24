import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "google-gax"],
  turbopack: {},
};

export default nextConfig;
