/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Disable linting during builds
  },
  typescript: {
    ignoreBuildErrors: true, // Skip type-checking (even without TypeScript)
  },
};

module.exports = nextConfig;
