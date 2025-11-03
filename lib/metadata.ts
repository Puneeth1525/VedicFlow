import { Metadata } from 'next';

export const siteConfig = {
  name: 'VedicFlo',
  title: 'VedicFlo - Master Vedic Chanting with AI-Powered Precision',
  description: 'Learn and perfect Vedic chanting with AI-powered pronunciation and swara analysis. Master ancient Sanskrit mantras with real-time feedback on pitch, tone, and accuracy.',
  url: 'https://vedic-flow.vercel.app',
  ogImage: 'https://vedic-flow.vercel.app/og-image.png',
  keywords: [
    'Vedic chanting',
    'Sanskrit mantras',
    'AI pronunciation',
    'swara analysis',
    'Vedic education',
    'mantra practice',
    'pitch detection',
    'Rig Veda',
    'Atharvaveda',
    'Vedic tradition',
    'Sanskrit learning',
    'spiritual practice',
    'meditation mantras',
    'Ganapati mantras',
    'Vedic recitation',
  ],
  author: {
    name: 'VedicFlo Team',
    url: 'https://vedic-flow.vercel.app',
  },
};

export function constructMetadata({
  title = siteConfig.title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  url = siteConfig.url,
  keywords = siteConfig.keywords,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  keywords?: string[];
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    creator: siteConfig.author.name,
    publisher: siteConfig.author.name,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@vedicflo',
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
  };
}

// Mantra-specific metadata generator
export function constructMantraMetadata(mantra: {
  id: string;
  title: string;
  category: string;
}): Metadata {
  const mantraDescriptions: Record<string, string> = {
    'ganesha-gayatri':
      'Learn and master the Ganesha Gayatri Mantra (ॐ एकदंताय विद्महे) with AI-powered swara analysis. Perfect your pronunciation and pitch with real-time feedback from the Ganapati Upanishad tradition.',
    'ganapati-prarthana':
      'Perfect your chanting of the Ganapati Vedic Invocation from Rig Veda. Master this sacred prayer to Lord Ganesha with AI-guided pronunciation, swara detection, and real-time pitch analysis.',
    'ganapathi-atharva-shirsham':
      'Master the profound Ganapati Atharvashirsha from the Atharvaveda. Learn this powerful Vedic hymn dedicated to Lord Ganesha with advanced AI pronunciation coaching and swara feedback.',
  };

  const mantraKeywords: Record<string, string[]> = {
    'ganesha-gayatri': [
      'Ganesha Gayatri Mantra',
      'Ekadantaya Vidmahe',
      'Ganapati Upanishad',
      'Vakratundaya mantra',
      'Ganesha meditation',
      'Sanskrit mantra learning',
      'Vedic chanting practice',
    ],
    'ganapati-prarthana': [
      'Ganapati Prarthana',
      'Rig Veda mantras',
      'Ganapati invocation',
      'Vedic prayers',
      'Lord Ganesha mantras',
      'Sanskrit prayers',
      'Vedic recitation',
    ],
    'ganapathi-atharva-shirsham': [
      'Ganapati Atharvashirsha',
      'Atharvaveda mantras',
      'Ganesha Atharvasirsa',
      'Om Namaste Ganapataye',
      'Vedic hymns',
      'Sanskrit sacred texts',
      'Atharva Veda chanting',
    ],
  };

  return constructMetadata({
    title: `${mantra.title} - Practice & Learn | VedicFlo`,
    description: mantraDescriptions[mantra.id] || `Learn and perfect the ${mantra.title} from ${mantra.category} with AI-powered pronunciation and swara analysis. Real-time feedback for authentic Vedic chanting.`,
    url: `${siteConfig.url}/practice/${mantra.id}`,
    keywords: [
      ...siteConfig.keywords,
      ...(mantraKeywords[mantra.id] || []),
      mantra.title,
      mantra.category,
    ],
  });
}

// Structured data generators
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [
      'https://twitter.com/vedicflo',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: siteConfig.url,
    },
  };
}

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/mantras?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getLearningResourceSchema(mantra: {
  id: string;
  title: string;
  category: string;
  audioUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: mantra.title,
    description: `Learn and practice ${mantra.title} from ${mantra.category} with AI-powered pronunciation feedback`,
    educationalLevel: 'Beginner to Advanced',
    learningResourceType: 'Interactive Exercise',
    inLanguage: 'sa',
    about: {
      '@type': 'Thing',
      name: 'Vedic Chanting',
      description: 'Ancient Indian spiritual practice of reciting Vedic mantras',
    },
    isAccessibleForFree: false,
    url: `${siteConfig.url}/practice/${mantra.id}`,
    ...(mantra.audioUrl && {
      audio: {
        '@type': 'AudioObject',
        name: `${mantra.title} Reference Audio`,
        contentUrl: `${siteConfig.url}${mantra.audioUrl}`,
      },
    }),
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalSubject',
      targetName: 'Vedic Studies',
    },
  };
}

export function getWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AI-powered pronunciation analysis',
      'Real-time swara detection',
      'Pitch and tone feedback',
      'Progress tracking',
      'Sacred mantra library',
      'Audio reference guidance',
    ],
  };
}
