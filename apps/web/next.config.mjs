/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT || "standalone",
  basePath: process.env.NEXT_BASE_PATH || "",
  assetPrefix: process.env.NEXT_BASE_PATH || "",
  images: {
    unoptimized: process.env.NEXT_OUTPUT === "export",
  },
};

export default nextConfig;
