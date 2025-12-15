/**
 * SeoHelmet - Reusable component for setting page-level SEO meta tags
 * 
 * Uses react-helmet-async to dynamically update document head based on
 * the current view and any dynamic data. This component should be placed
 * inside each major page/view component to set appropriate meta tags.
 * 
 * Usage:
 *   <SeoHelmet viewState={ViewState.LANDING} />
 *   <SeoHelmet viewState={ViewState.DETAIL} event={selectedEvent} />
 *   <SeoHelmet viewState={ViewState.HOST_PROFILE} hostName="John" hostBio="..." />
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ViewState, Event } from '../../types';
import { useSeoMetadata, SeoMetadataOptions } from '../../hooks/useSeoMetadata';

interface SeoHelmetProps {
  viewState: ViewState;
  event?: Event | null;
  hostName?: string;
  hostBio?: string;
  hostPhotoUrl?: string;
  city?: string;
  category?: string;
}

/**
 * SeoHelmet Component
 * 
 * Renders appropriate <title>, <meta>, and Open Graph tags based on
 * the current view state and any dynamic data provided.
 */
export const SeoHelmet: React.FC<SeoHelmetProps> = ({
  viewState,
  event,
  hostName,
  hostBio,
  hostPhotoUrl,
  city,
  category,
}) => {
  // Build options object for the hook
  const options: SeoMetadataOptions = {
    event,
    hostName,
    hostBio,
    hostPhotoUrl,
    city,
    category,
  };

  // Get computed metadata from the centralized hook
  const meta = useSeoMetadata(viewState, options);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={meta.ogType} />
      <meta property="og:url" content={meta.ogUrl} />
      <meta property="og:title" content={meta.ogTitle} />
      <meta property="og:description" content={meta.ogDescription} />
      <meta property="og:image" content={meta.ogImage} />
      <meta property="og:site_name" content="Popera" />
      <meta property="og:locale" content="en_CA" />

      {/* Twitter */}
      <meta name="twitter:card" content={meta.twitterCard} />
      <meta name="twitter:url" content={meta.ogUrl} />
      <meta name="twitter:title" content={meta.ogTitle} />
      <meta name="twitter:description" content={meta.ogDescription} />
      <meta name="twitter:image" content={meta.ogImage} />
    </Helmet>
  );
};

export default SeoHelmet;

