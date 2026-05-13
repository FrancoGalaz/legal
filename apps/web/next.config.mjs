/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT || "standalone",
  images: {
    unoptimized: process.env.NEXT_OUTPUT === "export",
  },
};

export default nextConfig;
