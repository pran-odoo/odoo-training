import { defineConfig } from 'vitepress'
import { withPwa } from '@vite-pwa/vitepress'

// Vercel sets VERCEL=1, GitHub Pages doesn't
const isVercel = process.env.VERCEL === '1'
const base = isVercel ? '/' : '/odoo-training/'

export default withPwa(defineConfig({
  vite: {
    build: {
      chunkSizeWarningLimit: 1000
    }
  },

  title: 'Odoo Functional Training',
  description: 'Free Odoo 19 training guide for functional consultants',

  // Dynamic base: '/' for Vercel, '/odoo-training/' for GitHub Pages
  base,

  head: [
    // Dynamic theme color for light/dark modes (Aurora Premium)
    ['meta', { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#4F46E5' }],
    ['meta', { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0C0A09' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }],
    ['link', { rel: 'apple-touch-icon', sizes: '192x192', href: `${base}icons/icon-192.png` }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}icons/icon-32.png` }],
  ],

  appearance: 'dark',

  themeConfig: {
    logo: '/icons/icon-32.png',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/introduction' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'What is Odoo?', link: '/what-is-odoo' },
          { text: 'Introduction', link: '/introduction' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: '1. Understanding Models', link: '/01-models' },
          { text: '2. Field Types Guide', link: '/02-field-types' },
          { text: '3. Relationships', link: '/03-relationships' },
          { text: '4. Field Storage', link: '/04-storage' },
          { text: '5. Computed Fields', link: '/05-computed' },
          { text: '6. Related Fields', link: '/06-related' },
          { text: '7. Group By & Stored Fields', link: '/07-groupby' }
        ]
      },
      {
        text: 'Views & UI',
        items: [
          { text: '8. Views', link: '/08-views' },
          { text: '9. Widgets', link: '/09-widgets' },
          { text: '10. Domain Filters', link: '/10-domains' },
          { text: '11. Field Properties', link: '/11-field-properties' }
        ]
      },
      {
        text: 'Security & Workflows',
        items: [
          { text: '12. Access Rights', link: '/12-access-rights' },
          { text: '13. Workflows', link: '/13-workflows' },
          { text: '14. Actions', link: '/14-actions' }
        ]
      },
      {
        text: 'Advanced',
        items: [
          { text: '15. Integration', link: '/15-integration' },
          { text: 'API Playground', link: '/api-playground' },
          { text: '16. Odoo Studio', link: '/16-studio' },
          { text: '17. Performance', link: '/17-performance' },
          { text: '18. Decision Matrix', link: '/18-decision-matrix' },
          { text: '19. Real-World Examples', link: '/19-examples' },
          { text: '20. Common Mistakes', link: '/20-mistakes' }
        ]
      },
      {
        text: 'Platform & Tools',
        items: [
          { text: '21. Odoo.sh', link: '/21-odoosh' },
          { text: '22. Chatter', link: '/22-chatter' },
          { text: '23. Email', link: '/23-email' },
          { text: '24. Context', link: '/24-context' },
          { text: '25. Constraints', link: '/25-constraints' },
          { text: '26. AI in Odoo 19', link: '/26-ai' },
          { text: '27. EDI Order Exchange', link: '/27-edi' }
        ]
      },
      {
        text: 'Inventory & Stock',
        items: [
          { text: '28. Removal Strategies', link: '/28-removal-strategies' }
        ]
      },
      {
        text: 'Enterprise Modules',
        items: [
          { text: '29. Databases App', link: '/29-databases' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pran-odoo/odoo-training' }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    // Footer is now handled by CustomFooter.vue with scramble effect
  },

  pwa: {
    registerType: 'prompt',
    injectRegister: 'script-defer', // Defer service worker registration for better LCP
    manifest: {
      name: 'Odoo Functional Training',
      short_name: 'Odoo Training',
      description: 'Comprehensive Odoo 19 training for functional consultants',
      theme_color: '#4F46E5',
      background_color: '#0C0A09',
      display: 'standalone',
      orientation: 'portrait-primary',
      categories: ['education', 'productivity'],
      icons: [
        {
          src: `${base}icons/icon-192.png`,
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: `${base}icons/icon-512.png`,
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: `${base}icons/icon-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    }
  }
}))
