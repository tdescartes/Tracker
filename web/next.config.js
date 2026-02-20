/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Required for Docker deployment
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "spoonacular.com" },
      { protocol: "https", hostname: "img.spoonacular.com" },
      { protocol: "https", hostname: "**.s3.amazonaws.com" },
    ],
  },
};

module.exports = nextConfig;
