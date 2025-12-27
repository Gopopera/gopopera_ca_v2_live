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
 * TicketStoryExport - A dedicated component for generating the downloadable ticket image.
 * Sized for Instagram Story (1080x1920, 9:16 aspect ratio).
 * Uses offscreen positioning for reliable html2canvas capture.
 * Sets data-ready="true" when all assets (fonts, QR canvas, images) are loaded.
 */
export const TicketStoryExport = forwardRef<HTMLDivElement, TicketStoryExportProps>(
  ({ event, hostName, qrUrl, formattedDate, eventImageUrl, onReady, debugMode = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const hasSignaledReady = useRef(false);
    
    // Image state
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoLoaded, setLogoLoaded] = useState(false);
    const [safeCoverDataUrl, setSafeCoverDataUrl] = useState<string | null>(null);
    const [coverLoaded, setCoverLoaded] = useState(false);

    // Format location properly with commas
    const location = React.useMemo(() => {
      // Try to extract neighborhood/area and city
      if (event.location) {
        // If full location is provided, use it
        return event.location;
      }
      
      // Build from parts
      const parts: string[] = [];
      if (event.address) {
        parts.push(event.address);
      }
      if (event.city) {
        parts.push(event.city);
      }
      if ((event as any).regionOrCountry || (event as any).country) {
        parts.push((event as any).regionOrCountry || (event as any).country);
      }
      
      if (parts.length === 0) {
        return 'Location TBD';
      }
      
      // Join with proper separators and clean up
      return parts
        .filter(Boolean)
        .join(', ')
        .replace(/,\s*,/g, ',')
        .replace(/^\s*,\s*|\s*,\s*$/g, '')
        .trim();
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

    // Load logo image as data URL (required for html2canvas)
    useEffect(() => {
      let cancelled = false;
      
      getSafeDataUrl('/Popera.png').then((dataUrl) => {
        if (!cancelled) {
          setLogoDataUrl(dataUrl);
          setLogoLoaded(true);
          console.log('[TicketStoryExport] Logo loaded:', dataUrl ? 'success' : 'failed');
        }
      });

      return () => {
        cancelled = true;
      };
    }, []);

    // Load cover image safely (convert to data URL to avoid CORS)
    useEffect(() => {
      if (!eventImageUrl) {
        setCoverLoaded(true);
        return;
      }

      let cancelled = false;
      
      getSafeDataUrl(eventImageUrl).then((dataUrl) => {
        if (!cancelled) {
          setSafeCoverDataUrl(dataUrl);
          setCoverLoaded(true);
          console.log('[TicketStoryExport] Cover loaded:', dataUrl ? 'success' : 'failed (using fallback)');
        }
      });

      return () => {
        cancelled = true;
      };
    }, [eventImageUrl]);

    // Check readiness and signal when ready
    const checkReadiness = useCallback(async () => {
      if (hasSignaledReady.current) return;
      if (!rootRef.current) return;

      try {
        // 1. Wait for fonts (with fallback if fonts API not available)
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        // 2. Wait for logo to be processed
        if (!logoLoaded) {
          return; // Still loading, try again later
        }

        // 3. Wait for cover image to be processed
        if (eventImageUrl && !coverLoaded) {
          return; // Still loading, try again later
        }

        // 4. Verify QR canvas exists and has dimensions
        const qrCanvas = rootRef.current.querySelector('canvas');
        if (qrCanvas) {
          if (qrCanvas.width === 0 || qrCanvas.height === 0) {
            await new Promise<void>((resolve) => {
              const checkCanvas = () => {
                if (qrCanvas.width > 0 && qrCanvas.height > 0) {
                  resolve();
                } else {
                  requestAnimationFrame(checkCanvas);
                }
              };
              checkCanvas();
            });
          }
        }

        // 5. Extra delay to ensure paint is complete
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          }, 150);
        });

        // Signal ready
        hasSignaledReady.current = true;
        if (rootRef.current) {
          rootRef.current.dataset.ready = 'true';
        }
        console.log('[TicketStoryExport] Ready signal set');
        onReady?.();
      } catch (err) {
        console.error('TicketStoryExport readiness check error:', err);
        // Signal ready anyway to prevent hanging
        hasSignaledReady.current = true;
        if (rootRef.current) {
          rootRef.current.dataset.ready = 'true';
        }
        onReady?.();
      }
    }, [onReady, eventImageUrl, coverLoaded, logoLoaded]);

    // Run readiness check on mount and when deps change
    useEffect(() => {
      hasSignaledReady.current = false;
      const timer = setTimeout(() => {
        checkReadiness();
      }, 50);
      return () => clearTimeout(timer);
    }, [checkReadiness]);

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
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #1f4d52 0%, #15383c 50%, #0f2a2d 100%)',
          }}
        />

        {/* Decorative glow circle */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(227, 94, 37, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Content container with safe margins */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '100px 60px 80px 60px',
            boxSizing: 'border-box',
          }}
        >
          {/* Popera Logo - Single logo at top center */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px',
              minHeight: '64px',
            }}
          >
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Popera"
                style={{
                  height: '64px',
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
            ) : (
              // Fallback text logo if image fails to load
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, color: '#ffffff', letterSpacing: '-1px' }}>
                  Popera
                </span>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#e35e25', borderRadius: '50%', marginLeft: '4px' }} />
              </div>
            )}
          </div>

          {/* Event Cover Image */}
          <div
            style={{
              width: '100%',
              height: '460px',
              borderRadius: '24px',
              overflow: 'hidden',
              marginBottom: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {safeCoverDataUrl ? (
              <img
                src={safeCoverDataUrl}
                alt={event.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              // Branded gradient placeholder (NO text)
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #2a5a60 0%, #1f4d52 50%, #15383c 100%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.15,
                    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
                                     radial-gradient(circle at 75% 75%, rgba(227,94,37,0.2) 0%, transparent 50%)`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(227, 94, 37, 0.25) 0%, transparent 70%)',
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Event Title - flow layout, no fixed height */}
          <div
            style={{
              marginBottom: '8px',
              paddingBottom: '4px', // Extra padding for descenders
            }}
          >
            <h1
              style={{
                fontSize: '50px',
                fontWeight: 700,
                color: '#ffffff',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.18,
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

          {/* Hosted by - with proper spacing */}
          <p
            style={{
              fontSize: '26px',
              color: 'rgba(255, 255, 255, 0.75)',
              textAlign: 'center',
              margin: '0 0 24px 0',
            }}
          >
            Hosted by <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>{hostName}</span>
          </p>

          {/* Event Details Card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px 32px',
              marginBottom: '24px',
              flexShrink: 0,
            }}
          >
            {/* Date */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Date
              </div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff' }}>
                {formattedDate}
              </div>
            </div>

            {/* Time */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Time
              </div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff' }}>
                {event.time || 'TBD'}
              </div>
            </div>

            {/* Location */}
            <div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Location
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', lineHeight: 1.25 }}>
                {location.length > 45 ? location.substring(0, 45) + '...' : location}
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              minHeight: 0,
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              }}
            >
              <QRCodeCanvas
                value={qrUrl}
                size={240}
                level="H"
                includeMargin={false}
                fgColor="#15383c"
                bgColor="#ffffff"
              />
            </div>

            <p
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#e35e25',
                textAlign: 'center',
                marginTop: '16px',
                marginBottom: 0,
              }}
            >
              Show this QR code at check-in
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: '12px',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.5)',
                margin: 0,
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
