import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Event } from '../../../types';
import { getSafeDataUrl } from '../../utils/safeImage';

interface TicketStoryExportProps {
  event: Event;
  hostName: string;
  qrUrl: string;
  formattedDate: string;
  eventImageUrl?: string;
  onReady?: () => void;
  debugMode?: boolean;
}

/**
 * TicketStoryExport - Liquid glass style ticket for Instagram Story (1080x1920).
 * Uses safe CSS subset for html-to-image compatibility (no backdrop-filter).
 * Signals ready only after all assets (logo, cover, fonts, QR) are loaded.
 */
export const TicketStoryExport = forwardRef<HTMLDivElement, TicketStoryExportProps>(
  ({ event, hostName, qrUrl, formattedDate, eventImageUrl, onReady, debugMode = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const hasSignaledReady = useRef(false);
    
    // Asset loading state
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
    const [coverLoaded, setCoverLoaded] = useState(false);

    // Format location with proper commas
    const formattedLocation = React.useMemo(() => {
      if (event.location) return event.location;
      
      const parts: string[] = [];
      if (event.address) parts.push(event.address);
      if (event.city) parts.push(event.city);
      if ((event as any).country) parts.push((event as any).country);
      
      return parts.length > 0 ? parts.filter(Boolean).join(', ') : 'Location TBD';
    }, [event]);

    // Combine refs
    const setRefs = useCallback((node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    // Load all assets on mount
    useEffect(() => {
      let cancelled = false;

      const loadAssets = async () => {
        // 1. Load logo (PNG with transparency)
        console.log('[TicketStoryExport] Loading logo...');
        try {
          const logoUrl = await getSafeDataUrl('/Popera.png');
          if (!cancelled) {
            setLogoDataUrl(logoUrl);
            setLogoLoaded(true);
            console.log('[TicketStoryExport] Logo loaded:', logoUrl ? 'success' : 'fallback');
          }
        } catch (err) {
          console.warn('[TicketStoryExport] Logo load error:', err);
          if (!cancelled) {
            setLogoDataUrl(null);
            setLogoLoaded(true);
          }
        }

        // 2. Load cover image (if provided)
        console.log('[TicketStoryExport] eventImageUrl:', eventImageUrl || '(none)');
        if (eventImageUrl) {
          try {
            const coverUrl = await getSafeDataUrl(eventImageUrl);
            if (!cancelled) {
              setCoverDataUrl(coverUrl);
              setCoverLoaded(true);
              console.log('[TicketStoryExport] Cover loaded:', coverUrl ? 'success' : 'fallback');
            }
          } catch (err) {
            console.warn('[TicketStoryExport] Cover load error:', err);
            if (!cancelled) {
              setCoverDataUrl(null);
              setCoverLoaded(true);
            }
          }
        } else {
          if (!cancelled) {
            console.log('[TicketStoryExport] No eventImageUrl, using fallback');
            setCoverLoaded(true);
          }
        }
      };

      loadAssets();

      return () => {
        cancelled = true;
      };
    }, [eventImageUrl]);

    // Signal ready when all assets loaded
    const checkAndSignalReady = useCallback(async () => {
      if (hasSignaledReady.current) return;
      if (!rootRef.current) return;
      if (!logoLoaded || !coverLoaded) return;

      try {
        // Wait for fonts
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        // Wait for QR canvas
        const qrCanvas = rootRef.current.querySelector('canvas');
        if (qrCanvas && (qrCanvas.width === 0 || qrCanvas.height === 0)) {
          await new Promise<void>((resolve) => {
            const check = () => {
              if (qrCanvas.width > 0 && qrCanvas.height > 0) resolve();
              else requestAnimationFrame(check);
            };
            check();
          });
        }

        // Wait for paint
        await new Promise(r => requestAnimationFrame(() => r(null)));
        await new Promise(r => setTimeout(r, 200));

        hasSignaledReady.current = true;
        if (rootRef.current) {
          rootRef.current.dataset.ready = 'true';
        }
        console.log('[TicketStoryExport] Ready signal set');
        onReady?.();
      } catch (err) {
        console.error('[TicketStoryExport] Ready check error:', err);
        hasSignaledReady.current = true;
        if (rootRef.current) {
          rootRef.current.dataset.ready = 'true';
        }
        onReady?.();
      }
    }, [logoLoaded, coverLoaded, onReady]);

    useEffect(() => {
      if (logoLoaded && coverLoaded) {
        checkAndSignalReady();
      }
    }, [logoLoaded, coverLoaded, checkAndSignalReady]);

    // Liquid glass styles (no backdrop-filter for html-to-image compatibility)
    const glassCard: React.CSSProperties = {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    };

    const glassCardInner: React.CSSProperties = {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '22px',
    };

    return (
      <div
        ref={setRefs}
        data-ready="false"
        style={{
          position: 'fixed',
          left: debugMode ? 0 : '-10000px',
          top: 0,
          width: '1080px',
          height: '1920px',
          pointerEvents: 'none',
          zIndex: debugMode ? 9999 : -1,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
          backgroundColor: '#15383c',
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(31, 77, 82, 0.4) 0%, transparent 40%, rgba(15, 42, 45, 0.6) 100%)',
          }}
        />

        {/* Decorative glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(227, 94, 37, 0.12) 0%, transparent 60%)',
          }}
        />

        {/* Content with safe padding */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '72px',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo - centered, TRANSPARENT background, NO box/border/shadow */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '32px',
              // NO background, NO border, NO shadow - completely transparent
            }}
          >
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Popera"
                style={{
                  height: '96px',
                  width: 'auto',
                  objectFit: 'contain',
                  // No background or border on the image itself
                }}
              />
            ) : (
              // Text fallback (no box, no background)
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ 
                  fontSize: '64px', 
                  fontWeight: 700, 
                  color: '#ffffff',
                  letterSpacing: '-1px',
                }}>
                  Popera
                </span>
                <span style={{ 
                  display: 'inline-block',
                  width: '14px', 
                  height: '14px', 
                  backgroundColor: '#e35e25', 
                  borderRadius: '50%', 
                  marginLeft: '6px',
                }} />
              </div>
            )}
          </div>

          {/* Main glass card */}
          <div style={{ ...glassCard, padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* Cover image container - overflow hidden ONLY here for rounded corners */}
            <div
              style={{
                width: '100%',
                height: '440px',
                borderRadius: '22px',
                overflow: 'hidden',
                marginBottom: '28px',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {coverDataUrl ? (
                <img
                  src={coverDataUrl}
                  alt={event.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                // Gradient placeholder (no text)
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #2a5a60 0%, #1f4d52 50%, #15383c 100%)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.2,
                      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Title container - NO fixed height, NO overflow hidden */}
            <div
              style={{
                marginBottom: '12px',
                paddingBottom: '16px', // Extra space for descenders (g, y, p, q, j)
              }}
            >
              <h1
                style={{
                  fontSize: '52px',
                  fontWeight: 800,
                  color: '#ffffff',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: 1.18,
                  // 3-line clamp
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {event.title}
              </h1>
            </div>

            {/* Hosted by - with explicit space */}
            <p
              style={{
                fontSize: '28px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                margin: '0 0 24px 0',
              }}
            >
              Hosted by{' '}
              <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                {hostName}
              </span>
            </p>

            {/* Info card - Date/Time/Location */}
            <div style={{ ...glassCardInner, padding: '24px', marginBottom: '24px', flexShrink: 0 }}>
              {/* Date */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px',
                  marginBottom: '4px',
                }}>
                  Date
                </div>
                <div style={{ fontSize: '30px', fontWeight: 600, color: '#ffffff' }}>
                  {formattedDate}
                </div>
              </div>

              {/* Time */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px',
                  marginBottom: '4px',
                }}>
                  Time
                </div>
                <div style={{ fontSize: '30px', fontWeight: 600, color: '#ffffff' }}>
                  {event.time || 'TBD'}
                </div>
              </div>

              {/* Location */}
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px',
                  marginBottom: '4px',
                }}>
                  Location
                </div>
                <div style={{ 
                  fontSize: '26px', 
                  fontWeight: 600, 
                  color: '#ffffff',
                  lineHeight: 1.3,
                }}>
                  {formattedLocation.length > 40 ? formattedLocation.substring(0, 40) + '...' : formattedLocation}
                </div>
              </div>
            </div>

            {/* QR Section - flex grow to center */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* QR in white rounded container */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)',
                }}
              >
                <QRCodeCanvas
                  value={qrUrl}
                  size={260}
                  level="H"
                  includeMargin={false}
                  fgColor="#15383c"
                  bgColor="#ffffff"
                />
              </div>

              {/* QR instruction in orange */}
              <p
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#e35e25',
                  textAlign: 'center',
                  marginTop: '20px',
                  marginBottom: 0,
                }}
              >
                Show this QR code at check-in
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: '24px',
            }}
          >
            <p
              style={{
                fontSize: '20px',
                color: 'rgba(242, 242, 242, 0.6)',
                margin: 0,
                letterSpacing: '1px',
              }}
            >
              gopopera.ca
            </p>
          </div>
        </div>
      </div>
    );
  }
);

TicketStoryExport.displayName = 'TicketStoryExport';
