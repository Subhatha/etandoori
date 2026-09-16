import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  output: "export",
  trailingSlash: true,

  basePath: process.env.NODE_ENV === "production" ? "/etandoori" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/etandoori/" : "",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;