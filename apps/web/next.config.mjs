/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sea-ops/schemas", "@sea-ops/mock-data", "@sea-ops/workers", "@sea-ops/agents", "@sea-ops/tools", "@sea-ops/core"],
};

export default nextConfig;
