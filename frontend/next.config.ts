import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:5000/socket.io/:path*',
      },
      {
        source: '/images/:path*',
        destination: 'http://localhost:5000/images/:path*',
      },
      {
        source: '/save-chat',
        destination: 'http://localhost:5000/save-chat',
      },
      {
        source: '/delete-chat',
        destination: 'http://localhost:5000/delete-chat',
      },
      {
        source: '/save-public-key',
        destination: 'http://localhost:5000/save-public-key',
      },
      {
        source: '/get-public-key/:userId',
        destination: 'http://localhost:5000/get-public-key/:userId',
      },
    ];
  },
};

export default nextConfig;
