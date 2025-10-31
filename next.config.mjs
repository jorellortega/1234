/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Tell Next.js to not bundle these packages - they'll be loaded at runtime
  // This prevents webpack from trying to bundle pdf-parse and mammoth
  serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize pdf-parse and mammoth on server side to avoid bundling issues
      config.externals = config.externals || []
      config.externals.push('pdf-parse', 'mammoth')
    }
    return config
  },
}

export default nextConfig
