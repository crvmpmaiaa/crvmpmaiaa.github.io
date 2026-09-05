import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: { root: __dirname },
  devIndicators: false,
};

export default nextConfig;
