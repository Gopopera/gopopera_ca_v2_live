import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Event } from '../../../types';
import { getSafeDataUrl } from '../../utils/safeImage';

interface TicketStoryExportProps {
  event: Event;
  hostName: string;
  qrUrl: string;
  formattedDate: string;
  eventImageUrl?: string; // Kept for API compatibility but NOT used
  onReady?: () => void;
  debugMode?: boolean;
  plainMode?: boolean;
}

/**
 * TicketStoryExport - Premium IG Story ticket (1080x1920).
 * No cover image (removed for reliability).
 * Liquid glass style without backdrop-filter.
 */
export const TicketStoryExport = forwardRef<HTMLDivElement, TicketStoryExportProps>(
  ({ event, hostName, qrUrl, formattedDate, onReady, debugMode = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const hasSignaledReady = useRef(false);
    
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoLoaded, setLogoLoaded] = useState(false);

    // Format location
    const formattedLocation = React.useMemo(() => {
      if (event.location) return event.location;
      const parts = [event.address, event.city, (event as any).country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Location TBD';
    }, [event]);

    // Safe host name
    const safeHostName = hostName || 'Popera';

    // Combine refs
    const setRefs = useCallback((node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    // Load logo on mount
    useEffect(() => {
      let cancelled = false;

      const loadLogo = async () => {
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
      };

      loadLogo();
      return () => { cancelled = true; };
    }, []);

    // Signal ready when logo loaded
    const checkAndSignalReady = useCallback(async () => {
      if (hasSignaledReady.current) return;
      if (!rootRef.current) return;
      if (!logoLoaded) return;

      try {
        // Wait for fonts
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        // Wait for QR canvas
        const qrCanvas = rootRef.current.querySelector('canvas');
        if (qrCanvas) {
          let attempts = 0;
          while ((qrCanvas.width === 0 || qrCanvas.height === 0) && attempts < 20) {
            await new Promise(r => requestAnimationFrame(r));
            attempts++;
          }
        }

        // Paint delay
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
    }, [logoLoaded, onReady]);

    useEffect(() => {
      if (logoLoaded) {
        checkAndSignalReady();
      }
    }, [logoLoaded, checkAndSignalReady]);

    // Glass card styles (no backdrop-filter)
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
          
          {/* Logo - 96px, centered, NO box/background */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', border: 'none' }}>
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Popera"
                style={{
                  height: '96px',
                  width: 'auto',
                  display: 'block',
                  margin: '0 auto',
                  background: 'transparent',
                }}
              />
            ) : (
              // Text fallback - no box
              <div style={{ display: 'flex', alignItems: 'baseline', background: 'transparent' }}>
                <span style={{ fontSize: '64px', fontWeight: 700, color: '#ffffff', letterSpacing: '-1px' }}>Popera</span>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', backgroundColor: '#e35e25', borderRadius: '50%', marginLeft: '6px' }} />
              </div>
            )}
          </div>

          {/* Spacer after logo (replaces removed cover image) */}
          <div style={{ height: '72px', flexShrink: 0 }} />

          {/* Title - max 3 lines, no clipping */}
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '0 0 10px 0' }}>
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                margin: 0,
                paddingBottom: '10px',
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
            {/* Debug: red baseline */}
            {debugMode && (
              <div style={{ height: '2px', backgroundColor: 'red', opacity: 0.7, marginTop: '4px' }} />
            )}
          </div>

          {/* Hosted by - explicit space */}
          <p style={{ fontSize: '28px', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', margin: '16px 0 32px 0' }}>
            Hosted by{' '}
            <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>{safeHostName}</span>
          </p>

          {/* Main glass card */}
          <div style={{ ...glassCard, padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
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
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', lineHeight: 1.3 }}>
                  {formattedLocation.length > 45 ? formattedLocation.substring(0, 45) + '...' : formattedLocation}
                </div>
              </div>
            </div>

            {/* QR Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)' }}>
                <QRCodeCanvas value={qrUrl} size={260} level="H" includeMargin={false} fgColor="#15383c" bgColor="#ffffff" />
              </div>
              <p style={{ fontSize: '24px', fontWeight: 600, color: '#e35e25', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
                Show this QR code at check-in
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '24px' }}>
            <p style={{ fontSize: '20px', color: 'rgba(242, 242, 242, 0.5)', margin: 0, letterSpacing: '1px' }}>gopopera.ca</p>
          </div>
        </div>
      </div>
    );
  }
);

TicketStoryExport.displayName = 'TicketStoryExport';
