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
  plainMode?: boolean;
}

type CoverStatus = 'loading' | 'ok' | 'failed';

/**
 * TicketStoryExport - Premium IG Story ticket (1080x1920).
 * Liquid glass style without backdrop-filter for html-to-image compatibility.
 * Two-phase image loading: fetch first, img element fallback.
 */
export const TicketStoryExport = forwardRef<HTMLDivElement, TicketStoryExportProps>(
  ({ event, hostName, qrUrl, formattedDate, eventImageUrl, onReady, debugMode = false, plainMode = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const hasSignaledReady = useRef(false);
    
    // Asset loading state
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
    const [coverStatus, setCoverStatus] = useState<CoverStatus>('loading');

    // Format location
    const formattedLocation = React.useMemo(() => {
      if (event.location) return event.location;
      const parts = [event.address, event.city, (event as any).country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Location TBD';
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

    // Load assets on mount
    useEffect(() => {
      let cancelled = false;

      const loadAssets = async () => {
        // 1. Load logo
        try {
          const logoUrl = await getSafeDataUrl('/popera-logo.png');
          if (!cancelled) {
            setLogoDataUrl(logoUrl);
            setLogoLoaded(true);
          }
        } catch {
          if (!cancelled) {
            setLogoDataUrl(null);
            setLogoLoaded(true);
          }
        }

        // 2. Load cover image
        if (plainMode) {
          // Skip loading in plain mode
          if (!cancelled) {
            setCoverStatus('failed');
          }
        } else if (eventImageUrl) {
          if (!cancelled) setCoverStatus('loading');
          try {
            const coverUrl = await getSafeDataUrl(eventImageUrl);
            if (!cancelled) {
              if (coverUrl) {
                setCoverDataUrl(coverUrl);
                setCoverStatus('ok');
              } else {
                setCoverStatus('failed');
              }
            }
          } catch {
            if (!cancelled) {
              setCoverStatus('failed');
            }
          }
        } else {
          // No cover image URL provided
          if (!cancelled) {
            setCoverStatus('failed');
          }
        }
      };

      loadAssets();
      return () => { cancelled = true; };
    }, [eventImageUrl, plainMode]);

    // Signal ready when all assets loaded
    const checkAndSignalReady = useCallback(async () => {
      if (hasSignaledReady.current) return;
      if (!rootRef.current) return;
      if (!logoLoaded) return;
      if (coverStatus === 'loading') return;

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
        onReady?.();
      } catch (err) {
        console.error('[TicketStoryExport] Ready check error:', err);
        hasSignaledReady.current = true;
        if (rootRef.current) {
          rootRef.current.dataset.ready = 'true';
        }
        onReady?.();
      }
    }, [logoLoaded, coverStatus, onReady]);

    useEffect(() => {
      if (logoLoaded && coverStatus !== 'loading') {
        checkAndSignalReady();
      }
    }, [logoLoaded, coverStatus, checkAndSignalReady]);

    // Styles
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

    // Title sizing: 52px font, 1.12 line height, 3 lines max
    const titleFontSize = 52;
    const titleLineHeight = 1.12;
    const titleMinHeight = titleFontSize * titleLineHeight * 3 + 16; // ~190px

    return (
      <div
        ref={setRefs}
        data-ready="false"
        style={{
          position: 'fixed',
          left: debugMode ? '50%' : '-10000px',
          top: debugMode ? '50%' : 0,
          transform: debugMode ? 'translate(-50%, -50%) scale(0.4)' : 'none',
          width: '1080px',
          height: '1920px',
          pointerEvents: 'none',
          zIndex: debugMode ? 9999 : -1,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
          backgroundColor: '#15383c',
          outline: debugMode ? '4px solid #e35e25' : 'none',
        }}
      >
        {/* Background gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(31, 77, 82, 0.4) 0%, transparent 40%, rgba(15, 42, 45, 0.6) 100%)' }} />

        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(227, 94, 37, 0.12) 0%, transparent 60%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '72px', boxSizing: 'border-box' }}>
          
          {/* Logo - 96px height, NO background/border/shadow */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Popera"
                style={{ height: '96px', width: 'auto', objectFit: 'contain' }}
              />
            ) : (
              // Text fallback - no box
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '64px', fontWeight: 700, color: '#ffffff', letterSpacing: '-1px' }}>Popera</span>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: '#e35e25', borderRadius: '50%', marginLeft: '6px' }} />
              </div>
            )}
          </div>

          {/* Main glass card */}
          <div style={{ ...glassCard, padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* Cover image container */}
            <div style={{ width: '100%', height: '420px', borderRadius: '22px', overflow: 'hidden', marginBottom: '28px', position: 'relative', flexShrink: 0 }}>
              {coverStatus === 'loading' ? (
                // Skeleton shimmer while loading
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)', animation: 'shimmer 1.5s infinite' }}>
                  <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
                </div>
              ) : coverStatus === 'ok' && coverDataUrl ? (
                // Real cover image
                <img src={coverDataUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                // Premium gradient placeholder (no text)
                <>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2a5a60 0%, #1f4d52 50%, #15383c 100%)' }} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.2, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(227,94,37,0.25) 0%, transparent 70%)' }} />
                </>
              )}
            </div>

            {/* Title container - NO fixed height, proper padding for descenders */}
            <div style={{ marginBottom: '8px', paddingBottom: '12px', minHeight: `${titleMinHeight}px`, overflow: 'visible', position: 'relative' }}>
              <h1
                style={{
                  fontSize: `${titleFontSize}px`,
                  fontWeight: 800,
                  color: '#ffffff',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: titleLineHeight,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                }}
              >
                {event.title}
              </h1>
              {/* Debug: red baseline to verify no clipping */}
              {debugMode && (
                <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '2px', backgroundColor: 'red', opacity: 0.7 }} />
              )}
            </div>

            {/* Hosted by */}
            <p style={{ fontSize: '28px', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', margin: '0 0 24px 0' }}>
              Hosted by{' '}
              <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>{hostName}</span>
            </p>

            {/* Info card */}
            <div style={{ ...glassCardInner, padding: '24px', marginBottom: '24px', flexShrink: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Date</div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff' }}>{formattedDate}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Time</div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff' }}>{event.time || 'TBD'}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Location</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', lineHeight: 1.3 }}>{formattedLocation.length > 40 ? formattedLocation.substring(0, 40) + '...' : formattedLocation}</div>
              </div>
            </div>

            {/* QR Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)' }}>
                <QRCodeCanvas value={qrUrl} size={240} level="H" includeMargin={false} fgColor="#15383c" bgColor="#ffffff" />
              </div>
              <p style={{ fontSize: '22px', fontWeight: 600, color: '#e35e25', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
                Show this QR code at check-in
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '20px' }}>
            <p style={{ fontSize: '18px', color: 'rgba(242, 242, 242, 0.5)', margin: 0, letterSpacing: '1px' }}>gopopera.ca</p>
          </div>
        </div>
      </div>
    );
  }
);

TicketStoryExport.displayName = 'TicketStoryExport';
