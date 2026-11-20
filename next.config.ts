import type { NextConfig } from 'next'

// COVERAGE=1 builds a separate, source-mapped bundle so e2e V8 coverage maps back to src/.
const coverage = process.env.COVERAGE === '1'

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // WASM Postgres and native image codecs must load from node_modules, not the bundle.
  serverExternalPackages: ['@electric-sql/pglite', 'sharp'],
  // Images are pre-sized WebP variants served by /api/media (no runtime optimizer needed).
  images: {
    loader: 'custom',
    loaderFile: './src/ui/media-loader.ts',
    deviceSizes: [320, 640, 1024, 1600],
    imageSizes: [160],
  },
  // Product photos are up to 8 MB (spec §7.3).
  experimental: { serverActions: { bodySizeLimit: '9mb' } },
  ...(coverage && {
    distDir: '.next-cov',
    productionBrowserSourceMaps: true,
    webpack: (config: {
      devtool?: string
      optimization?: { minimize?: boolean }
      output?: { devtoolModuleFilenameTemplate?: (i: { absoluteResourcePath: string }) => string }
    }) => {
      config.devtool = 'source-map'
      // Tag our own sources so coverage never confuses them with Next's (which also has src/…).
      const src = `${process.cwd()}/src/`
      if (config.output)
        config.output.devtoolModuleFilenameTemplate = (i) =>
          i.absoluteResourcePath.startsWith(src)
            ? `rlc/src/${i.absoluteResourcePath.slice(src.length)}`
            : i.absoluteResourcePath
      if (config.optimization) config.optimization.minimize = false
      return config
    },
  }),
}

export default nextConfig
