import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'raw.githubusercontent.com',
      },
      {
        hostname: 'charisma.rocks',
      },
      {
        hostname:
          'bafkreifq2bezvmjwfztjt4s3clt7or43kewxtg4ntbqur6axnh5qchkemu.ipfs.nftstorage.link',
      },
    ],
  },
};

export default nextConfig;
