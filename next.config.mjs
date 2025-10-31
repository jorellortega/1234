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
  // This prevents webpack from trying to bundle pdf-parse, mammoth, pdf2json
  serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'pdf2json'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize pdf-parse, mammoth, and pdf2json on server side to avoid bundling issues
      config.externals = config.externals || []
      config.externals.push('pdf-parse', 'mammoth', 'pdf2json')
    }
    return config
  },
}

export default nextConfig
