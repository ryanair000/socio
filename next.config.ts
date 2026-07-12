import type { NextConfig } from 'next';
const nextConfig: NextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true }, webpack: config => { config.parallelism = 128; return config; } };
export default nextConfig;
