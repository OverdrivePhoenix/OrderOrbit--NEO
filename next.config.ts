import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "google-gax"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to bundle native Node.js modules used by firebase-admin
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "firebase-admin",
        "@google-cloud/firestore",
        "google-gax",
      ];
    }
    return config;
  },
};

export default nextConfig;
