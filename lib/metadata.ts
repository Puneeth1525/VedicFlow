import { Metadata } from 'next';

export const siteConfig = {
  name: 'VedicFlo',
  title: 'VedicFlo - Master Vedic Chanting with AI-Powered Precision',
  description: 'Learn and perfect Vedic chanting with AI-powered pronunciation and swara analysis. Master ancient Sanskrit mantras with real-time feedback on pitch, tone, and accuracy.',
  url: 'https://vedicflo.com',
  ogImage: 'https://vedicflo.com/logo.png',
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
    url: 'https://vedicflo.com',
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
      'Learn and master the Ganesha Gayatri Mantra (ॐ एकदंताय विद्महे वक्रतुण्डाय धीमहि तन्नो दन्तिः प्रचोदयात्) with AI-powered swara analysis. This sacred mantra from Ganapati Upanishad invokes Lord Ganesha for wisdom and removal of obstacles. Perfect your Sanskrit pronunciation, pitch accuracy, and traditional Vedic intonation with real-time AI feedback on udātta, anudātta, and swarita swaras.',
    'ganapati-prarthana':
      'Perfect your chanting of the Ganapati Vedic Invocation (ॐ गं गणपतिं हवामहे) from Rig Veda. This ancient prayer to Lord Ganesha is traditionally chanted before beginning any important task. Master authentic Vedic pronunciation with AI-guided swara detection, learn proper syllable emphasis, and receive instant feedback on pitch variations. Track your progress as you develop perfect intonation of this powerful mantra.',
    'ganapathi-atharva-shirsham':
      'Master the profound Ganapati Atharvashirsha (ॐ नमस्ते गणपतये) from the Atharvaveda, one of the most sacred hymns dedicated to Lord Ganesha. This powerful Upanishadic text reveals the cosmic nature of Ganesha and is chanted for spiritual wisdom, success, and divine blessings. Learn complex Sanskrit pronunciation patterns, master intricate swara variations, and receive advanced AI coaching on pitch, tone, and rhythm for authentic Vedic recitation.',
  };

  const mantraKeywords: Record<string, string[]> = {
    'ganesha-gayatri': [
      'Ganesha Gayatri Mantra',
      'Ekadantaya Vidmahe',
      'Vakratundaya Dhimahi',
      'Ganapati Upanishad',
      'Vakratundaya mantra',
      'Ganesha meditation mantra',
      'Sanskrit mantra learning',
      'Vedic chanting practice',
      'Ganesha gayatri meaning',
      'learn Ganesha mantra',
      'obstacle removal mantra',
      'wisdom mantra',
    ],
    'ganapati-prarthana': [
      'Ganapati Prarthana',
      'Om Gam Ganapatim',
      'Rig Veda mantras',
      'Ganapati invocation',
      'Vedic prayers to Ganesha',
      'Lord Ganesha mantras',
      'Sanskrit prayers',
      'Vedic recitation',
      'Ganesha prayer',
      'starting prayer',
      'success mantra',
      'auspicious beginning mantra',
    ],
    'ganapathi-atharva-shirsham': [
      'Ganapati Atharvashirsha',
      'Ganapati Atharvasirsa',
      'Atharvaveda mantras',
      'Om Namaste Ganapataye',
      'Ganesha Upanishad',
      'Atharvashirsha meaning',
      'Vedic hymns',
      'Sanskrit sacred texts',
      'Atharva Veda chanting',
      'Ganesha Atharvashirsha benefits',
      'powerful Ganesha mantra',
      'Ganapati stotra',
    ],
  };

  const mantraOgImages: Record<string, string> = {
    'ganesha-gayatri': `${siteConfig.url}/og-ganesha-gayatri.png`,
    'ganapati-prarthana': `${siteConfig.url}/og-ganapati-prarthana.png`,
    'ganapathi-atharva-shirsham': `${siteConfig.url}/og-ganapati-atharvashirsha.png`,
  };

  return constructMetadata({
    title: `${mantra.title} - Learn with AI Pronunciation & Swara Analysis | VedicFlo`,
    description: mantraDescriptions[mantra.id] || `Learn and perfect the ${mantra.title} from ${mantra.category} with AI-powered pronunciation and swara analysis. Real-time feedback for authentic Vedic chanting.`,
    url: `${siteConfig.url}/practice/${mantra.id}`,
    image: mantraOgImages[mantra.id] || siteConfig.ogImage,
    keywords: [
      ...siteConfig.keywords,
      ...(mantraKeywords[mantra.id] || []),
      mantra.title,
      mantra.category,
      'learn online',
      'AI-powered learning',
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
  const mantraDetails: Record<string, { description: string; teaches: string[]; benefits: string[] }> = {
    'ganesha-gayatri': {
      description: 'Learn the Ganesha Gayatri Mantra from Ganapati Upanishad with AI-powered swara analysis and pronunciation feedback. Master authentic Vedic intonation patterns.',
      teaches: [
        'Correct Sanskrit pronunciation of Ganesha Gayatri',
        'Udātta, Anudātta, and Swarita swara patterns',
        'Traditional Vedic pitch modulation',
        'Syllable-by-syllable accuracy',
        'Real-time pronunciation feedback',
      ],
      benefits: [
        'Removes obstacles in learning and life',
        'Enhances wisdom and intelligence',
        'Improves focus and concentration',
        'Develops authentic Vedic chanting skills',
      ],
    },
    'ganapati-prarthana': {
      description: 'Perfect the Ganapati Vedic Invocation from Rig Veda with AI coaching. Master this auspicious prayer chanted before new beginnings.',
      teaches: [
        'Authentic Rig Vedic pronunciation',
        'Proper swara emphasis and rhythm',
        'Traditional chanting cadence',
        'Pitch accuracy with AI feedback',
        'Verse-by-verse mastery',
      ],
      benefits: [
        'Ensures auspicious beginnings',
        'Invokes success and prosperity',
        'Develops clarity of speech',
        'Strengthens Sanskrit pronunciation',
      ],
    },
    'ganapathi-atharva-shirsham': {
      description: 'Master the profound Ganapati Atharvashirsha from Atharvaveda. Learn this powerful Upanishadic hymn with advanced AI pronunciation analysis.',
      teaches: [
        'Complex Atharvaveda pronunciation patterns',
        'Intricate swara variations and transitions',
        'Extended mantra recitation techniques',
        'Advanced pitch control and modulation',
        'Traditional Upanishadic chanting style',
      ],
      benefits: [
        'Deep spiritual wisdom and insight',
        'Powerful protection and blessings',
        'Success in all endeavors',
        'Mastery of advanced Vedic recitation',
      ],
    },
  };

  const details = mantraDetails[mantra.id] || {
    description: `Learn and practice ${mantra.title} from ${mantra.category} with AI-powered pronunciation feedback`,
    teaches: ['Correct pronunciation', 'Swara patterns', 'Vedic intonation'],
    benefits: ['Spiritual growth', 'Sanskrit mastery'],
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: mantra.title,
    description: details.description,
    educationalLevel: 'Beginner to Advanced',
    learningResourceType: 'Interactive Exercise',
    inLanguage: ['sa', 'en'],
    teaches: details.teaches,
    about: [
      {
        '@type': 'Thing',
        name: 'Vedic Chanting',
        description: 'Ancient Indian spiritual practice of reciting Vedic mantras with proper pronunciation and pitch',
      },
      {
        '@type': 'Thing',
        name: mantra.title,
        description: `Sacred mantra from ${mantra.category}`,
      },
    ],
    isAccessibleForFree: false,
    url: `${siteConfig.url}/practice/${mantra.id}`,
    ...(mantra.audioUrl && {
      audio: {
        '@type': 'AudioObject',
        name: `${mantra.title} Reference Audio`,
        description: 'Professional Vedic recitation for learning and practice',
        contentUrl: `${siteConfig.url}${mantra.audioUrl}`,
        encodingFormat: 'audio/mpeg',
      },
    }),
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalSubject',
      targetName: 'Vedic Studies',
      educationalFramework: 'Traditional Vedic Education',
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
    provider: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    hasPart: details.teaches.map((skill) => ({
      '@type': 'LearningResource',
      name: skill,
      learningResourceType: 'Skill',
    })),
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
