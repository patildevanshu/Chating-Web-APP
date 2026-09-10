import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
      {
        source: '/images/:path*',
        destination: `${backendUrl}/images/:path*`,
      },
      {
        source: '/save-chat',
        destination: `${backendUrl}/save-chat`,
      },
      {
        source: '/delete-chat',
        destination: `${backendUrl}/delete-chat`,
      },
      {
        source: '/save-public-key',
        destination: `${backendUrl}/save-public-key`,
      },
      {
        source: '/get-public-key/:userId',
        destination: `${backendUrl}/get-public-key/:userId`,
      },
    ];
  },
};

export default nextConfig;
