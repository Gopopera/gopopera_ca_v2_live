/**
 * Dynamic OG Image Generator for Popera Events
 * 
 * Generates beautiful Open Graph images that match the event info page design
 * for better social media previews when sharing event links.
 * 
 * Usage: /api/og-image?eventId=xxx
 */

import { ImageResponse } from '@vercel/og';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

// Fetch event data from Firestore via REST API
async function getEventData(eventId: string): Promise<any | null> {
  try {
    // Use Firestore REST API to fetch event
    const projectId = process.env.FIREBASE_PROJECT_ID || 'popera-d4829';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events/${eventId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch event:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (!data.fields) return null;
    
    // Parse Firestore response format
    const fields = data.fields;
    return {
      id: eventId,
      title: fields.title?.stringValue || 'Untitled Event',
      description: fields.description?.stringValue || '',
      date: fields.date?.stringValue || '',
      time: fields.time?.stringValue || '',
      city: fields.city?.stringValue || '',
      address: fields.address?.stringValue || '',
      location: fields.location?.stringValue || '',
      category: fields.category?.stringValue || 'Community',
      price: fields.price?.stringValue || 'Free',
      hostName: fields.hostName?.stringValue || 'Local Host',
      imageUrl: fields.imageUrl?.stringValue || '',
      imageUrls: fields.imageUrls?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
      feeAmount: fields.feeAmount?.integerValue ? parseInt(fields.feeAmount.integerValue) : null,
      hasFee: fields.hasFee?.booleanValue || false,
    };
  } catch (error) {
    console.error('Error fetching event data:', error);
    return null;
  }
}

// Format date for display
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Get price display
function formatPrice(event: any): string {
  if (event.hasFee && event.feeAmount && event.feeAmount > 0) {
    const amount = event.feeAmount / 100;
    return `$${amount.toFixed(0)} CAD`;
  }
  if (event.price && event.price !== 'Free' && event.price !== '' && event.price !== '$0') {
    const priceStr = event.price.toString();
    return priceStr.startsWith('$') ? priceStr : `$${priceStr}`;
  }
  return 'Free';
}

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      // Return default Popera OG image
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #15383c 0%, #1f4d52 50%, #15383c 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
              <span style={{ fontSize: '72px', fontWeight: 'bold', color: '#ffffff' }}>Popera</span>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e35e25', marginLeft: '4px' }}></span>
            </div>
            <p style={{ fontSize: '28px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: '600px' }}>
              Small in-person experiences, hosted by people near you
            </p>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
    
    // Fetch event data
    const event = await getEventData(eventId);
    
    if (!event) {
      // Return default OG image if event not found
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #15383c 0%, #1f4d52 50%, #15383c 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
              <span style={{ fontSize: '72px', fontWeight: 'bold', color: '#ffffff' }}>Popera</span>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e35e25', marginLeft: '4px' }}></span>
            </div>
            <p style={{ fontSize: '28px', color: 'rgba(255,255,255,0.8)' }}>Discover local experiences</p>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
    
    // Get event image
    const eventImage = event.imageUrls?.[0] || event.imageUrl || '';
    const priceText = formatPrice(event);
    const dateText = formatDate(event.date);
    const locationText = event.location || event.city || '';
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            position: 'relative',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Background Image */}
          {eventImage && (
            <img
              src={eventImage}
              style={{
                position: 'absolute',
                width: '1200px',
                height: '630px',
                objectFit: 'cover',
              }}
              alt=""
            />
          )}
          
          {/* Gradient Overlay - matches event info page */}
          <div
            style={{
              position: 'absolute',
              width: '1200px',
              height: '630px',
              background: eventImage 
                ? 'linear-gradient(to bottom, rgba(21,56,60,0.3) 0%, rgba(21,56,60,0.6) 40%, rgba(21,56,60,0.95) 100%)'
                : 'linear-gradient(135deg, #15383c 0%, #1f4d52 50%, #15383c 100%)',
            }}
          />
          
          {/* Content Container */}
          <div
            style={{
              position: 'absolute',
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '40px',
            }}
          >
            {/* Top Row: Logo + Category */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Popera Logo */}
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff' }}>Popera</span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e35e25', marginLeft: '2px' }}></span>
              </div>
              
              {/* Category Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  backgroundColor: 'rgba(227,94,37,0.9)',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {event.category}
                </span>
              </div>
            </div>
            
            {/* Bottom Section: Event Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Event Title */}
              <h1
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  margin: 0,
                  lineHeight: 1.1,
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                  maxWidth: '900px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {event.title}
              </h1>
              
              {/* Event Info Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginTop: '8px' }}>
                {/* Date & Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e35e25" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.95)' }}>
                    {dateText} • {event.time}
                  </span>
                </div>
                
                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e35e25" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.95)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {locationText}
                  </span>
                </div>
                
                {/* Price */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    backgroundColor: priceText === 'Free' ? 'rgba(74,222,128,0.9)' : 'rgba(227,94,37,0.9)',
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                    {priceText}
                  </span>
                </div>
              </div>
              
              {/* Host Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)' }}>Hosted by</span>
                <span style={{ fontSize: '20px', fontWeight: '600', color: '#ffffff' }}>{event.hostName}</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return fallback image on error
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #15383c 0%, #1f4d52 50%, #15383c 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '72px', fontWeight: 'bold', color: '#ffffff' }}>Popera</span>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e35e25', marginLeft: '4px' }}></span>
          </div>
          <p style={{ fontSize: '28px', color: 'rgba(255,255,255,0.8)' }}>Discover local experiences</p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}

