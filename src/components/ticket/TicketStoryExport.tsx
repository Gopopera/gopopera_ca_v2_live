import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Event } from '../../../types';

interface TicketStoryExportProps {
  event: Event;
  hostName: string;
  qrUrl: string;
  formattedDate: string;
  onReady?: () => void;
  debugMode?: boolean;
}

/**
 * TicketStoryExport - A dedicated component for generating the downloadable ticket image.
 * Sized for Instagram Story (1080x1920, 9:16 aspect ratio).
 * Uses opacity:0 instead of offscreen positioning for reliable capture.
 * Sets data-ready="true" when all assets (fonts, QR canvas) are loaded.
 * NOTE: External cover image removed to avoid CORS tainting - uses branded placeholder instead.
 */
export const TicketStoryExport = forwardRef<HTMLDivElement, TicketStoryExportProps>(
  ({ event, hostName, qrUrl, formattedDate, onReady, debugMode = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const hasSignaledReady = useRef(false);

    const location = event.location || 
      `${event.address || ''}, ${event.city || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Location TBD';

    // Combine refs
    const setRefs = useCallback((node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    // Check readiness and signal when ready
    const checkReadiness = useCallback(async () => {
      if (hasSignaledReady.current) return;
      if (!rootRef.current) return;

      try {
        // 1. Wait for fonts (with fallback if fonts API not available)
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        // 2. No external cover image in export (placeholder used) to avoid CORS tainting

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
    }, [onReady]);

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
          // Use offscreen positioning instead of opacity:0 for reliable html2canvas capture
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
          {/* Popera Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <span
              style={{
                fontSize: '48px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-1px',
              }}
            >
              Popera
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor: '#e35e25',
                borderRadius: '50%',
                marginLeft: '4px',
              }}
            />
          </div>

          {/* Event Cover Image - Placeholder (no external image to avoid CORS) */}
          <div
            style={{
              width: '100%',
              height: '520px',
              borderRadius: '24px',
              overflow: 'hidden',
              marginBottom: '40px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              position: 'relative',
            }}
          >
            {/* Gradient background */}
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
                opacity: 0.12,
                backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25) 0%, transparent 55%),
                                 radial-gradient(circle at 80% 70%, rgba(227,94,37,0.25) 0%, transparent 55%)`,
              }}
            />
            {/* Center brand mark */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '56px', fontWeight: 800, color: '#f2f2f2', opacity: 0.92 }}>
                Popera
              </span>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '999px',
                  background: '#e35e25',
                  opacity: 0.92,
                  display: 'inline-block',
                }}
              />
            </div>
          </div>

          {/* Event Title */}
          <h1
            style={{
              fontSize: '52px',
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              margin: '0 0 16px 0',
              lineHeight: 1.2,
              maxHeight: '130px',
              overflow: 'hidden',
            }}
          >
            {event.title}
          </h1>

          {/* Hosted by */}
          <p
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              margin: '0 0 40px 0',
            }}
          >
            Hosted by {hostName}
          </p>

          {/* Event Details Card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '32px 40px',
              marginBottom: '40px',
            }}
          >
            {/* Date */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Date
              </div>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#ffffff' }}>
                {formattedDate}
              </div>
            </div>

            {/* Time */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Time
              </div>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#ffffff' }}>
                {event.time || 'TBD'}
              </div>
            </div>

            {/* Location */}
            <div>
              <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Location
              </div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', lineHeight: 1.3 }}>
                {location.length > 40 ? location.substring(0, 40) + '...' : location}
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
                size={280}
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
                marginTop: '24px',
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
              paddingTop: '20px',
            }}
          >
            <p
              style={{
                fontSize: '22px',
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
