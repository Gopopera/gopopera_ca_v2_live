/**
 * TicketExportWrapper - Wrapper for ticket export with html2canvas
 * Uses TicketCardMock variant="export" for consistent white-background downloads
 */

import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import { TicketCardMock, TicketCardMockProps } from './TicketCardMock';

interface TicketExportWrapperProps extends Omit<TicketCardMockProps, 'variant'> {
    onReady?: () => void;
    debugMode?: boolean;
}

/**
 * Export wrapper that renders TicketCardMock in a fixed position for html2canvas capture.
 * Signals ready when fonts are loaded and component is painted.
 */
export const TicketExportWrapper = forwardRef<HTMLDivElement, TicketExportWrapperProps>(
    ({ onReady, debugMode = false, ...cardProps }, ref) => {
        const rootRef = useRef<HTMLDivElement>(null);
        const hasSignaledReady = useRef(false);

        // Combine refs
        const setRefs = useCallback((node: HTMLDivElement | null) => {
            rootRef.current = node;
            if (typeof ref === 'function') {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
        }, [ref]);

        const checkAndSignalReady = useCallback(async () => {
            if (hasSignaledReady.current) return;
            if (!rootRef.current) return;

            try {
                // Wait for fonts
                if (document.fonts?.ready) {
                    await document.fonts.ready;
                }

                // Wait for QR canvas (if using Canvas variant)
                const qrCanvas = rootRef.current.querySelector('canvas');
                if (qrCanvas) {
                    let attempts = 0;
                    while ((qrCanvas.width === 0 || qrCanvas.height === 0) && attempts < 20) {
                        await new Promise(r => requestAnimationFrame(r));
                        attempts++;
                    }
                }

                // Wait for images to load
                const images = rootRef.current.querySelectorAll<HTMLImageElement>('img');
                await Promise.all(
                    Array.from(images).map((img: HTMLImageElement) => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve; // Don't block on failed images
                        });
                    })
                );

                // Paint delay
                await new Promise(r => setTimeout(r, 200));

                hasSignaledReady.current = true;
                if (rootRef.current) {
                    rootRef.current.dataset.ready = 'true';
                }
                onReady?.();
            } catch (err) {
                console.error('[TicketExportWrapper] Ready check error:', err);
                hasSignaledReady.current = true;
                if (rootRef.current) {
                    rootRef.current.dataset.ready = 'true';
                }
                onReady?.();
            }
        }, [onReady]);

        useEffect(() => {
            checkAndSignalReady();
        }, [checkAndSignalReady]);

        return (
            <div
                ref={setRefs}
                data-ready="false"
                style={{
                    position: 'fixed',
                    left: debugMode ? '50%' : '-10000px',
                    top: debugMode ? '50%' : 0,
                    transform: debugMode ? 'translate(-50%, -50%)' : 'none',
                    width: '440px',
                    backgroundColor: '#f7f3ee', // Warm cream background for premium feel
                    padding: '30px',
                    borderRadius: '8px',
                    zIndex: debugMode ? 9999 : -1,
                    pointerEvents: 'none',
                    outline: debugMode ? '4px solid #e35e25' : 'none',
                }}
            >
                <TicketCardMock {...cardProps} variant="export" />
            </div>
        );
    }
);

TicketExportWrapper.displayName = 'TicketExportWrapper';

export default TicketExportWrapper;
