import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Try treating it as external to skip turbopack parsing it fully,
  // or disable turbopack for this build by using next build with --webpack
  // Since we run npm run build, we can configure package.json to pass --webpack.
  // Actually, we can just omit turbopack config and use the webpack fallback.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
      };
    }
    return config;
  },
};

export default nextConfig;
