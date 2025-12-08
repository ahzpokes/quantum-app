// next.config.js
const withPlugins = require('next-compose-plugins');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withPlugins([withBundleAnalyzer], {
  reactStrictMode: true,
  images: {
    domains: ['votre-domaine-d-api.com'],
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  i18n: {
    locales: ['fr'],
    defaultLocale: 'fr',
  },
});
