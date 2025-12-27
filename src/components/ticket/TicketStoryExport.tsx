import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Event } from '../../../types';
import { getSafeDataUrl } from '../../utils/safeImage';
import { truncateTitle } from '../../utils/formatTicketText';

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
 * No cover image. No line-clamp. Clean transparent logo.
 * Liquid glass style without backdrop-filter.
 */
export const TicketStoryExport = forwardRef<HTMLDivElement, TicketStoryExportProps>(
  ({ event, hostName, qrUrl, formattedDate, onReady, debugMode = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const hasSignaledReady = useRef(false);
    
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoLoaded, setLogoLoaded] = useState(false);

    // Format location with proper spacing
    const formattedLocation = React.useMemo(() => {
      if (event.location) return event.location;
      const parts = [event.address, event.city, (event as any).country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Location TBD';
    }, [event]);

    // Safe host name (never undefined)
    const safeHostName = hostName || 'Popera';

    // Safe title (JS truncation, no CSS clamp)
    const safeTitle = truncateTitle(event.title, 120);

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

    // Glass card styles (no backdrop-filter for html-to-image compatibility)
    const glassCard: React.CSSProperties = {
      background: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '34px',
      boxShadow: '0 30px 90px rgba(0, 0, 0, 0.25)',
    };

    return (
      <div
        ref={setRefs}
        data-ready="false"
        style={{
          position: 'fixed',
          left: debugMode ? '50%' : '-10000px',
          top: debugMode ? '50%' : 0,
          transform: debugMode ? 'translate(-50%, -50%) scale(0.35)' : 'none',
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(31, 77, 82, 0.5) 0%, transparent 35%, rgba(15, 42, 45, 0.7) 100%)' }} />

        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: '-250px', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(227, 94, 37, 0.1) 0%, transparent 55%)' }} />

        {/* Content */}
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: '86px',
          paddingRight: '86px',
          paddingTop: '84px',
          paddingBottom: '70px',
          boxSizing: 'border-box',
        }}>
          
          {/* Logo - 280px, centered, NO box/background at all */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Popera"
                style={{
                  height: '280px',
                  width: 'auto',
                  display: 'block',
                  backgroundColor: 'transparent',
                }}
              />
            ) : (
              // Text fallback - no box, larger
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '140px', fontWeight: 700, color: '#ffffff', letterSpacing: '-2px' }}>Popera</span>
                <span style={{ display: 'inline-block', width: '28px', height: '28px', backgroundColor: '#e35e25', borderRadius: '50%', marginLeft: '12px' }} />
              </div>
            )}
          </div>

          {/* Title - NO clamp, JS truncation, no overflow hidden */}
          <h1
            style={{
              fontSize: '78px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.14,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              margin: 0,
              marginTop: '26px',
              marginBottom: '10px',
              paddingBottom: '18px',
              maxWidth: '920px',
              alignSelf: 'center',
              wordBreak: 'break-word',
            }}
          >
            {safeTitle}
          </h1>

          {/* Hosted by - explicit space using template literal */}
          <div style={{
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.85)',
            textAlign: 'center',
            marginTop: '6px',
            marginBottom: '30px',
          }}>
            {`Hosted by `}
            <span style={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>{safeHostName}</span>
          </div>

          {/* Main content area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
            
            {/* Info card */}
            <div style={{ ...glassCard, padding: '44px' }}>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Date</div>
                <div style={{ fontSize: '44px', fontWeight: 600, color: '#ffffff' }}>{formattedDate}</div>
              </div>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Time</div>
                <div style={{ fontSize: '40px', fontWeight: 600, color: '#ffffff' }}>{event.time || 'TBD'}</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Location</div>
                <div style={{ fontSize: '36px', fontWeight: 600, color: '#ffffff', lineHeight: 1.25 }}>
                  {formattedLocation.length > 50 ? formattedLocation.substring(0, 50) + '...' : formattedLocation}
                </div>
              </div>
            </div>

            {/* QR Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '36px' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '26px',
                width: '440px',
                height: '440px',
                padding: '18px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}>
                <QRCodeCanvas
                  value={qrUrl}
                  size={404}
                  level="H"
                  includeMargin={false}
                  fgColor="#15383c"
                  bgColor="#ffffff"
                />
              </div>
              <p style={{
                fontSize: '26px',
                fontWeight: 600,
                color: '#e35e25',
                textAlign: 'center',
                marginTop: '26px',
                marginBottom: '20px',
              }}>
                Show this QR code at check-in
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '10px' }}>
            <p style={{ fontSize: '22px', color: 'rgba(242, 242, 242, 0.5)', margin: 0, letterSpacing: '1.5px' }}>gopopera.ca</p>
          </div>
        </div>
      </div>
    );
  }
);

TicketStoryExport.displayName = 'TicketStoryExport';
