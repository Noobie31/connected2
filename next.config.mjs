import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // optional
};

export default withPWA({
  ...nextConfig,
  dest: "public",           // service worker output
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Optional: exclude some files from caching
  // exclude: [/middleware-manifest\.json$/],
});
