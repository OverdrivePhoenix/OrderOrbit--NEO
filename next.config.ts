import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "google-gax"],
  turbopack: {},
};

export default nextConfig;
