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
    const [safeCoverDataUrl, setSafeCoverDataUrl] = useState<string | null>(null);
    const [coverLoaded, setCoverLoaded] = useState(false);

    // Format location properly with commas
    const location = React.useMemo(() => {
      const parts: string[] = [];
      
      // Try to extract neighborhood/area and city
      if (event.location) {
        // If full location is provided, use it but clean it up
        return event.location;
      }
      
      // Build from parts
      if (event.address) {
        // Extract neighborhood/area from address if it contains one
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
        .replace(/,\s*,/g, ',') // Remove double commas
        .replace(/^\s*,\s*|\s*,\s*$/g, '') // Trim leading/trailing commas
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

        // 2. Wait for cover image to be processed
        if (eventImageUrl && !coverLoaded) {
          // Still loading, try again later
          return;
        }

        // 3. Verify QR canvas exists and has dimensions
        const qrCanvas = rootRef.current.querySelector('canvas');
        if (qrCanvas) {
          // Wait for canvas to have proper dimensions
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

        // 4. Extra delay to ensure paint is complete
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          }, 100);
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
    }, [onReady, eventImageUrl, coverLoaded]);

    // Run readiness check on mount and when deps change
    useEffect(() => {
      hasSignaledReady.current = false;
      // Small delay to let React finish rendering
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
          // Use offscreen positioning for reliable html2canvas capture
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
            padding: '120px 60px',
            boxSizing: 'border-box',
          }}
        >
          {/* Popera Logo - Single logo at top center using actual image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <img
              src="/Popera.png"
              alt="Popera"
              style={{
                height: '52px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Event Cover Image - Show real image if available, otherwise gradient placeholder */}
          <div
            style={{
              width: '100%',
              height: '480px',
              borderRadius: '24px',
              overflow: 'hidden',
              marginBottom: '36px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              position: 'relative',
            }}
          >
            {safeCoverDataUrl ? (
              // Real event cover image (converted to safe data URL)
              <img
                src={safeCoverDataUrl}
                alt={event.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              // Branded gradient placeholder (NO Popera text)
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #2a5a60 0%, #1f4d52 50%, #15383c 100%)',
                  }}
                />
                {/* Subtle pattern overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.15,
                    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
                                     radial-gradient(circle at 75% 75%, rgba(227,94,37,0.2) 0%, transparent 50%)`,
                  }}
                />
                {/* Decorative shapes instead of text */}
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
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(227, 94, 37, 0.3) 0%, transparent 70%)',
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Event Title - with proper line clamping */}
          <h1
            style={{
              fontSize: '54px',
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              margin: '0 0 12px 0',
              lineHeight: 1.15,
              // Line clamping for max 3 lines
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {event.title}
          </h1>

          {/* Hosted by - with proper spacing */}
          <p
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              margin: '0 0 32px 0',
            }}
          >
            <span style={{ opacity: 0.8 }}>Hosted by</span>
            <span style={{ marginLeft: '8px', fontWeight: 500 }}>{hostName}</span>
          </p>

          {/* Event Details Card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '28px 36px',
              marginBottom: '32px',
            }}
          >
            {/* Date */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Date
              </div>
              <div style={{ fontSize: '30px', fontWeight: 600, color: '#ffffff' }}>
                {formattedDate}
              </div>
            </div>

            {/* Time */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Time
              </div>
              <div style={{ fontSize: '30px', fontWeight: 600, color: '#ffffff' }}>
                {event.time || 'TBD'}
              </div>
            </div>

            {/* Location - properly formatted */}
            <div>
              <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Location
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, color: '#ffffff', lineHeight: 1.3 }}>
                {location.length > 50 ? location.substring(0, 50) + '...' : location}
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
            }}
          >
            {/* QR Code Container */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
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

            {/* QR Instruction */}
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

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: '16px',
            }}
          >
            <p
              style={{
                fontSize: '20px',
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
