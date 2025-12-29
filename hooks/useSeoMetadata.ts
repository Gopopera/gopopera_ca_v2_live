/**
 * useSeoMetadata - Centralized SEO metadata hook for the Popera SPA
 * 
 * Generates view-aware meta tags for improved SEO within a CSR SPA.
 * All copy aligns with Popera's positioning as a peer-to-peer marketplace
 * for small, in-person experiences (3–50 person circles).
 */

import { useMemo } from 'react';
import { ViewState, Event } from '../types';

// Base URL for canonical URLs and OG tags
const BASE_URL = 'https://gopopera.ca';

// Default OG image for brand consistency
const DEFAULT_OG_IMAGE = `${BASE_URL}/2.jpg`;

// Brand name and positioning — peer-to-peer marketplace for small, in-person experiences
const BRAND_NAME = 'Popera';
const BRAND_TAGLINE = 'Small in-person experiences, hosted by people near you';
const BRAND_DESCRIPTION = 'Join intimate 3–50 person circles in your neighborhood to cook, create, learn, and connect — or host your own and earn from what you know.';

/**
 * SEO metadata structure returned by the hook
 */
export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogType: 'website' | 'article' | 'profile';
  twitterCard: 'summary' | 'summary_large_image';
}

/**
 * Optional data for dynamic metadata generation
 */
export interface SeoMetadataOptions {
  event?: Event | null;
  hostName?: string;
  hostBio?: string;
  hostPhotoUrl?: string;
  city?: string;
  category?: string;
}

/**
 * Format event date for SEO-friendly display
 */
function formatEventDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Get experience type label from event
 */
function getExperienceTypeLabel(event: Event): string {
  if (event.mainCategory) {
    const categoryLabels: Record<string, string> = {
      curatedSales: 'Small-group sale',
      connectAndPromote: 'Networking circle',
      mobilizeAndSupport: 'Community gathering',
      learnAndGrow: 'Learning circle',
    };
    return categoryLabels[event.mainCategory] || event.category || 'In-person experience';
  }
  return event.category || 'In-person experience';
}

/**
 * Static metadata for each view state
 */
const STATIC_METADATA: Partial<Record<ViewState, Partial<SeoMetadata>>> = {
  [ViewState.LANDING]: {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    canonicalUrl: BASE_URL,
    ogType: 'website',
  },
  [ViewState.FEED]: {
    title: `Explore Circles Near You — ${BRAND_NAME}`,
    description: 'Browse small, intimate circles hosted by locals — cooking nights, creative workshops, learning sessions, and social gatherings for 3–50 people.',
    canonicalUrl: `${BASE_URL}/explore`,
    ogType: 'website',
  },
  [ViewState.ABOUT]: {
    title: `About Us — ${BRAND_NAME}`,
    description: 'Popera connects neighbors through small, in-person experiences. Learn how we are building a peer-to-peer marketplace for intimate circles across Canada.',
    canonicalUrl: `${BASE_URL}/about`,
    ogType: 'website',
  },
  [ViewState.GUIDELINES]: {
    title: `Community Guidelines — ${BRAND_NAME}`,
    description: 'Guidelines for hosts and guests to ensure safe, respectful, and memorable small-group experiences on Popera.',
    canonicalUrl: `${BASE_URL}/guidelines`,
    ogType: 'website',
  },
  [ViewState.TERMS]: {
    title: `Terms of Service — ${BRAND_NAME}`,
    description: 'Read Popera\'s Terms of Service for our peer-to-peer experience marketplace.',
    canonicalUrl: `${BASE_URL}/terms`,
    ogType: 'website',
  },
  [ViewState.PRIVACY]: {
    title: `Privacy Policy — ${BRAND_NAME}`,
    description: 'Learn how Popera protects your privacy and handles your personal information.',
    canonicalUrl: `${BASE_URL}/privacy`,
    ogType: 'website',
  },
  [ViewState.SAFETY]: {
    title: `Safety Center — ${BRAND_NAME}`,
    description: 'Safety tips and resources for hosts and guests joining small-group experiences on Popera.',
    canonicalUrl: `${BASE_URL}/safety`,
    ogType: 'website',
  },
  [ViewState.HELP]: {
    title: `Help Center — ${BRAND_NAME}`,
    description: 'Get help with Popera — FAQs, support resources, and guides for hosts and guests.',
    canonicalUrl: `${BASE_URL}/help`,
    ogType: 'website',
  },
  [ViewState.CAREERS]: {
    title: `Careers — ${BRAND_NAME}`,
    description: 'Join the Popera team and help build the peer-to-peer marketplace for small, in-person experiences.',
    canonicalUrl: `${BASE_URL}/careers`,
    ogType: 'website',
  },
  [ViewState.CONTACT]: {
    title: `Contact Us — ${BRAND_NAME}`,
    description: 'Get in touch with the Popera team for support, partnerships, or press inquiries.',
    canonicalUrl: `${BASE_URL}/contact`,
    ogType: 'website',
  },
  [ViewState.PRESS]: {
    title: `Press — ${BRAND_NAME}`,
    description: 'Press resources, media kit, and news about Popera.',
    canonicalUrl: `${BASE_URL}/press`,
    ogType: 'website',
  },
  [ViewState.CANCELLATION]: {
    title: `Cancellation Policy — ${BRAND_NAME}`,
    description: 'Understand Popera\'s cancellation and refund policies for hosts and guests.',
    canonicalUrl: `${BASE_URL}/cancellation`,
    ogType: 'website',
  },
  [ViewState.CREATE_EVENT]: {
    title: `Host a Circle — ${BRAND_NAME}`,
    description: 'Create and share your own small-group experience on Popera. From cooking to crafts, share your passion with your neighborhood and get paid for what you know.',
    canonicalUrl: `${BASE_URL}/create-event`,
    ogType: 'website',
  },
  [ViewState.AUTH]: {
    title: `Sign In — ${BRAND_NAME}`,
    description: 'Sign in or create an account to host and join small-group experiences on Popera.',
    canonicalUrl: `${BASE_URL}/auth`,
    ogType: 'website',
  },
  [ViewState.GUIDE_10_SEAT]: {
    title: `The 10-Seat Event Playbook | ${BRAND_NAME}`,
    description: 'Practical 5-step guide for creators to host and fill small in-person circles (3–10 seats) in their city — plus copy-paste templates.',
    canonicalUrl: `${BASE_URL}/the-10-seat-event-playbook`,
    ogType: 'website',
  },
};

/**
 * Generate event detail page metadata
 */
function getEventDetailMetadata(event: Event): SeoMetadata {
  const experienceType = getExperienceTypeLabel(event);
  const hostName = event.hostName || event.host || 'a local host';
  const city = event.city || 'your neighborhood';
  const formattedDate = formatEventDate(event.date);
  const groupSize = event.capacity ? `${event.capacity} people` : 'a small group';
  
  // Build a rich, SEO-friendly description
  const description = truncate(
    `${event.title} — ${experienceType} in ${city}. Hosted by ${hostName} for ${groupSize} on ${formattedDate}. ${event.description || ''}`,
    160
  );

  // Use dynamic OG image that matches the event info page design
  // This creates a beautiful, consistent preview for social media sharing
  const ogImage = `${BASE_URL}/api/og-image?eventId=${event.id}`;

  return {
    title: `${event.title} — ${BRAND_NAME}`,
    description,
    canonicalUrl: `${BASE_URL}/event/${event.id}`,
    ogTitle: event.title,
    ogDescription: description,
    ogUrl: `${BASE_URL}/event/${event.id}`,
    ogImage,
    ogType: 'article',
    twitterCard: 'summary_large_image',
  };
}

/**
 * Generate host profile page metadata
 */
function getHostProfileMetadata(options: SeoMetadataOptions): SeoMetadata {
  const { hostName = 'Host', hostBio, hostPhotoUrl } = options;
  
  const description = hostBio 
    ? truncate(hostBio, 160)
    : `Discover small-group experiences hosted by ${hostName} on Popera. Join their upcoming circles and connect with your community.`;

  // Encode host name for URL (handle special characters)
  const encodedHostName = encodeURIComponent(hostName.toLowerCase().replace(/\s+/g, '-'));

  return {
    title: `Circles by ${hostName} — ${BRAND_NAME}`,
    description,
    canonicalUrl: `${BASE_URL}/host/${encodedHostName}`,
    ogTitle: `${hostName} on Popera`,
    ogDescription: description,
    ogUrl: `${BASE_URL}/host/${encodedHostName}`,
    ogImage: hostPhotoUrl || DEFAULT_OG_IMAGE,
    ogType: 'profile',
    twitterCard: 'summary',
  };
}

/**
 * Generate city page metadata (for future use)
 */
function getCityMetadata(city: string): Partial<SeoMetadata> {
  const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  return {
    title: `Circles in ${cityName} — ${BRAND_NAME}`,
    description: `Discover small-group experiences in ${cityName}. Join cooking nights, creative workshops, learning circles, and more hosted by your neighbors.`,
    canonicalUrl: `${BASE_URL}/${city.toLowerCase()}/experiences`,
    ogType: 'website',
  };
}

/**
 * Generate category page metadata (for future use)
 */
function getCategoryMetadata(category: string): Partial<SeoMetadata> {
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  return {
    title: `${categoryName} Circles — ${BRAND_NAME}`,
    description: `Browse ${categoryName.toLowerCase()} circles on Popera. Join intimate 3–50 person experiences and learn from hosts in your neighborhood.`,
    canonicalUrl: `${BASE_URL}/circles/${category.toLowerCase()}`,
    ogType: 'website',
  };
}

/**
 * Main SEO metadata hook
 */
export function useSeoMetadata(
  viewState: ViewState,
  options: SeoMetadataOptions = {}
): SeoMetadata {
  return useMemo(() => {
    // Default metadata as fallback
    const defaultMeta: SeoMetadata = {
      title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
      description: BRAND_DESCRIPTION,
      canonicalUrl: BASE_URL,
      ogTitle: BRAND_NAME,
      ogDescription: BRAND_DESCRIPTION,
      ogUrl: BASE_URL,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      twitterCard: 'summary_large_image',
    };

    // Handle dynamic views first
    if (viewState === ViewState.DETAIL && options.event) {
      return getEventDetailMetadata(options.event);
    }

    if (viewState === ViewState.HOST_PROFILE && options.hostName) {
      return getHostProfileMetadata(options);
    }

    // Check for city/category pages (future-proofing)
    if (options.city && !options.category) {
      const cityMeta = getCityMetadata(options.city);
      return { ...defaultMeta, ...cityMeta, ogTitle: cityMeta.title || defaultMeta.ogTitle, ogDescription: cityMeta.description || defaultMeta.ogDescription };
    }

    if (options.category && !options.city) {
      const catMeta = getCategoryMetadata(options.category);
      return { ...defaultMeta, ...catMeta, ogTitle: catMeta.title || defaultMeta.ogTitle, ogDescription: catMeta.description || defaultMeta.ogDescription };
    }

    // Use static metadata for known view states
    const staticMeta = STATIC_METADATA[viewState];
    if (staticMeta) {
      const result = {
        ...defaultMeta,
        ...staticMeta,
        ogTitle: staticMeta.title || defaultMeta.ogTitle,
        ogDescription: staticMeta.description || defaultMeta.ogDescription,
        ogUrl: staticMeta.canonicalUrl || defaultMeta.ogUrl,
      };
      // Handle guide-specific OG image
      if (viewState === ViewState.GUIDE_10_SEAT) {
        result.ogImage = `${BASE_URL}/guides/playbook/hero.png`;
      }
      return result;
    }

    // Fallback to default for unknown views
    return defaultMeta;
  }, [viewState, options.event?.id, options.hostName, options.city, options.category]);
}

/**
 * Export constants for use in other components
 */
export { BASE_URL, DEFAULT_OG_IMAGE, BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION };
