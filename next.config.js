/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Disable linting during builds
  },
  typescript: {
    ignoreBuildErrors: true, // Skip type-checking (even without TypeScript)
  },
  output: 'export', // Enable static export
  assetPrefix: '/website', // Replace <repository-name> with your repo name
  basePath: '/website', // Replace <repository-name> with your repo name
};

module.exports = nextConfig;
