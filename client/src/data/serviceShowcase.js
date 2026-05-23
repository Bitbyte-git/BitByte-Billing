import { BarChart3, Code2, Megaphone, Search, Sparkles, TrendingUp } from 'lucide-react';

export const coreServices = [
  {
    id: 'personal-branding',
    name: 'Personal Branding',
    tagline: 'Logo design, identity kits, visual branding & profile growth',
    description: 'Build a magnetic personal brand with premium design systems, social-ready creatives, and consistent visual storytelling.',
    icon: Sparkles,
    accent: '#a855f7',
    gradient: 'from-violet-600 via-purple-500 to-fuchsia-500',
    glow: 'rgba(168,85,247,0.35)',
    samples: [
      { src: '/assets/personal-branding/PB1.png', title: 'Brand Identity Sample' },
      { src: '/assets/personal-branding/PB2.png', title: 'Visual Branding Sample' },
      { src: '/assets/personal-branding/PB3.png', title: 'Logo & Mark Sample' },
      { src: '/assets/personal-branding/PB4.png', title: 'Profile Creative Sample' },
      { src: '/assets/personal-branding/PB5.png', title: 'Content Design Sample' },
      { src: '/assets/personal-branding/PB6.png', title: 'Brand Collateral Sample' }
    ]
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    tagline: 'Social, ads, WhatsApp campaigns & performance marketing',
    description: 'Full-funnel digital campaigns engineered for reach, engagement, and measurable ROI across Meta, WhatsApp, and more.',
    icon: Megaphone,
    accent: '#3b82f6',
    gradient: 'from-blue-600 via-indigo-500 to-violet-500',
    glow: 'rgba(59,130,246,0.35)',
    samples: [
      { src: '/assets/digital-marketing/DM1.png', title: 'Campaign Creative' },
      { src: '/assets/digital-marketing/DM2.png', title: 'Social Media Sample' },
      { src: '/assets/digital-marketing/DM3.png', title: 'Ad Performance Sample' },
      { src: '/assets/digital-marketing/DM4.png', title: 'WhatsApp Campaign' }
    ],
    placeholderCount: 4
  },
  {
    id: 'seo-services',
    name: 'SEO Services',
    tagline: 'SEO, AEO, GEO, local SEO & content optimization',
    description: 'Dominate search and AI-driven discovery with technical SEO, content strategy, and competitor intelligence.',
    icon: Search,
    accent: '#10b981',
    gradient: 'from-emerald-600 via-teal-500 to-cyan-500',
    glow: 'rgba(16,185,129,0.35)',
    samples: [
      { src: '/assets/seo-services/SEO1.png', title: 'Search Rankings' },
      { src: '/assets/seo-services/SEO2.png', title: 'Content SEO Sample' },
      { src: '/assets/seo-services/SEO3.png', title: 'Local SEO Sample' },
      { src: '/assets/seo-services/SEO4.png', title: 'Analytics Dashboard' }
    ],
    placeholderCount: 4
  },
  {
    id: 'business-analytics',
    name: 'Business Analytics & Intelligence',
    tagline: 'Dashboards, KPI tracking, forecasting & automation',
    description: 'Turn raw data into executive-ready insights with BI dashboards, predictive models, and automated reporting.',
    icon: BarChart3,
    accent: '#f59e0b',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    glow: 'rgba(245,158,11,0.35)',
    samples: [
      { src: '/assets/business-analytics/BA1.png', title: 'BI Dashboard' },
      { src: '/assets/business-analytics/BA2.png', title: 'Revenue Analytics' },
      { src: '/assets/business-analytics/BA3.png', title: 'KPI Monitoring' },
      { src: '/assets/business-analytics/BA4.png', title: 'Forecasting View' }
    ],
    placeholderCount: 4
  },
  {
    id: 'web-app-development',
    name: 'Web App Development',
    tagline: 'Websites, dashboards, e-commerce & custom applications',
    description: 'High-performance web experiences—from landing pages to enterprise portals—with modern UX and scalable architecture.',
    icon: Code2,
    accent: '#6366f1',
    gradient: 'from-indigo-600 via-purple-600 to-violet-600',
    glow: 'rgba(99,102,241,0.35)',
    samples: [
      { src: '/assets/web-app-development/WEB1.png', title: 'Website Sample' },
      { src: '/assets/web-app-development/WEB2.png', title: 'Dashboard UI' },
      { src: '/assets/web-app-development/WEB3.png', title: 'E-Commerce Sample' },
      { src: '/assets/web-app-development/WEB4.png', title: 'Web Application' }
    ],
    placeholderCount: 4
  },
  {
    id: 'performance-growth',
    name: 'Performance & Growth',
    tagline: 'Conversion tracking, growth strategy & campaign optimization',
    description: 'Accelerate revenue with conversion optimization, growth experiments, and always-on performance marketing.',
    icon: TrendingUp,
    accent: '#ec4899',
    gradient: 'from-pink-600 via-rose-500 to-orange-400',
    glow: 'rgba(236,72,153,0.35)',
    samples: [
      { src: '/assets/performance-growth/PG1.png', title: 'Growth Funnel' },
      { src: '/assets/performance-growth/PG2.png', title: 'Conversion Tracking' },
      { src: '/assets/performance-growth/PG3.png', title: 'Campaign ROI' },
      { src: '/assets/performance-growth/PG4.png', title: 'Engagement Metrics' }
    ],
    placeholderCount: 4
  }
];
