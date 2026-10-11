/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // `npm run lint` is the place for lint feedback; the production build
    // should not fail on style nits.
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
