/**
 * TicketCardMock - Single source of truth for ticket card layout
 * Matches the mock design: white card, event image top,
 * details, dotted divider, reservation info, Popera mark left + small QR right
 * 
 * Polish pass: tighter spacing, mobile-first width, smaller QR, refined typography
 */

import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

export interface TicketCardMockProps {
    title: string;
    hostName?: string;
    imageUrl?: string;
    dateLabel: string;
    timeLabel: string;
    locationLabel: string;
    reservationId: string;
    paymentLabel: string; // e.g. "Free", "$25.00 CAD", "Pay at the door: $15.00 CAD"
    qrValue: string;
    attendeeCount?: number;
    showClaimCTA?: boolean;
    claimUrl?: string;
    onClaimClick?: () => void;
    /** "web" = interactive display, "export" = static for image capture */
    variant?: 'web' | 'export';
    /** Status badges */
    isCancelled?: boolean;
    isCheckedIn?: boolean;
}

/**
 * Shared ticket card component matching the mock design.
 * Pure presentational - no data fetching, no routing.
 */
export const TicketCardMock: React.FC<TicketCardMockProps> = ({
    title,
    hostName,
    imageUrl,
    dateLabel,
    timeLabel,
    locationLabel,
    reservationId,
    paymentLabel,
    qrValue,
    attendeeCount,
    showClaimCTA,
    onClaimClick,
    variant = 'web',
    isCancelled,
    isCheckedIn,
}) => {
    // Fallback image if none provided
    const displayImage = imageUrl || `https://picsum.photos/seed/${reservationId}/800/450`;

    // Use Canvas for export (html2canvas compatible), SVG for web
    const QRComponent = variant === 'export' ? QRCodeCanvas : QRCodeSVG;

    // For export variant, use inline styles (no Tailwind)
    if (variant === 'export') {
        return (
            <div
                id="ticket-export-root"
                style={{
                    width: '380px',
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                }}
            >
                {/* Event Image */}
                <div style={{ position: 'relative' }}>
                    <img
                        src={displayImage}
                        alt={title}
                        crossOrigin="anonymous"
                        style={{
                            width: '100%',
                            height: '160px',
                            objectFit: 'cover',
                        }}
                    />
                    {/* Popera logo overlay on image */}
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        display: 'flex',
                        alignItems: 'baseline',
                    }}>
                        <span style={{
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14px',
                            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        }}>P</span>
                        <span style={{
                            display: 'inline-block',
                            width: '4px',
                            height: '4px',
                            backgroundColor: '#e35e25',
                            borderRadius: '50%',
                            marginLeft: '1px',
                        }} />
                    </div>
                    {/* Status badges */}
                    {isCancelled && (
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '4px 10px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '999px',
                        }}>
                            Cancelled
                        </div>
                    )}
                    {isCheckedIn && !isCancelled && (
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '4px 10px',
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '999px',
                        }}>
                            ✓ Checked In
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{ padding: '16px' }}>
                    {/* Title */}
                    <h2 style={{
                        margin: '0 0 8px 0',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#15383c',
                        lineHeight: 1.2,
                    }}>
                        {title}
                    </h2>

                    {/* Host */}
                    {hostName && (
                        <p style={{
                            margin: '0 0 12px 0',
                            fontSize: '13px',
                            color: '#6b7280',
                        }}>
                            Hosted by <span style={{ fontWeight: 600, color: '#15383c' }}>{hostName}</span>
                        </p>
                    )}

                    {/* Event Details */}
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <p style={{
                                margin: '0 0 1px 0',
                                fontSize: '10px',
                                color: '#9ca3af',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                fontWeight: 600,
                            }}>DATE & TIME</p>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#15383c',
                                fontWeight: 500,
                            }}>{dateLabel} • {timeLabel}</p>
                        </div>
                        <div>
                            <p style={{
                                margin: '0 0 1px 0',
                                fontSize: '10px',
                                color: '#9ca3af',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                fontWeight: 600,
                            }}>LOCATION</p>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#15383c',
                                fontWeight: 500,
                            }}>{locationLabel}</p>
                        </div>
                    </div>

                    {/* Dotted Divider */}
                    <div style={{
                        borderTop: '1px dotted #d1d5db',
                        margin: '12px 0',
                    }} />

                    {/* Reservation Info */}
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                        }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>Reservation ID</span>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#15383c',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                            }}>#{reservationId}</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>Payment</span>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: paymentLabel.includes('door') ? '#d97706' : '#15383c',
                            }}>{paymentLabel}</span>
                        </div>
                        {attendeeCount && attendeeCount > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '6px',
                            }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Attendees</span>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#15383c',
                                }}>{attendeeCount}</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom row: Popera mark left, small QR right */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        paddingTop: '8px',
                    }}>
                        {/* Popera mark */}
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                            <span style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#15383c',
                                letterSpacing: '-0.3px',
                            }}>Popera</span>
                            <span style={{
                                display: 'inline-block',
                                width: '4px',
                                height: '4px',
                                backgroundColor: '#e35e25',
                                borderRadius: '50%',
                                marginLeft: '1px',
                            }} />
                        </div>

                        {/* QR code - with tile frame */}
                        {!isCancelled && (
                            <div style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '8px',
                            }}>
                                <QRComponent
                                    value={qrValue}
                                    size={96}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#15383c"
                                    bgColor="#ffffff"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div >
        );
    }

    // Web variant - uses Tailwind, mobile-first sizing
    return (
        <div
            id="ticket-export-root"
            className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-md w-full"
            style={{ maxWidth: '380px' }}
        >
            {/* Event Image */}
            <div className="relative">
                <img
                    src={displayImage}
                    alt={title}
                    className="w-full object-cover"
                    style={{ height: '160px' }}
                />
                {/* Popera logo overlay on image */}
                <div className="absolute top-3 left-3 flex items-baseline">
                    <span className="text-white font-bold text-sm drop-shadow-md">P</span>
                    <span className="w-1 h-1 bg-[#e35e25] rounded-full ml-0.5" />
                </div>
                {/* Status badges */}
                {isCancelled && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                        Cancelled
                    </div>
                )}
                {isCheckedIn && !isCancelled && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Checked In
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h2 className="text-lg font-bold text-[#15383c] mb-2 leading-tight">
                    {title}
                </h2>

                {/* Host */}
                {hostName && (
                    <p className="text-xs text-gray-500 mb-3">
                        Hosted by <span className="font-semibold text-[#15383c]">{hostName}</span>
                    </p>
                )}

                {/* Event Details */}
                <div className="space-y-2 mb-3">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">DATE & TIME</p>
                        <p className="text-sm text-[#15383c] font-medium">{dateLabel} • {timeLabel}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">LOCATION</p>
                        <p className="text-sm text-[#15383c] font-medium">{locationLabel}</p>
                    </div>
                </div>

                {/* Dotted Divider */}
                <div className="border-t border-dotted border-gray-300 my-3" />

                {/* Reservation Info */}
                <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Reservation ID</span>
                        <span className="font-mono text-xs font-semibold text-[#15383c]">#{reservationId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Payment</span>
                        <span className={`text-xs font-semibold ${paymentLabel.includes('door') ? 'text-amber-600' : 'text-[#15383c]'}`}>
                            {paymentLabel}
                        </span>
                    </div>
                    {attendeeCount && attendeeCount > 1 && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Attendees</span>
                            <span className="text-xs font-semibold text-[#15383c]">{attendeeCount}</span>
                        </div>
                    )}
                </div>

                {/* Bottom row: Popera mark left, small QR right */}
                <div className="flex justify-between items-end pt-2">
                    {/* Popera mark */}
                    <div className="flex items-baseline">
                        <span className="text-sm font-bold text-[#15383c] tracking-tight">Popera</span>
                        <span className="w-1 h-1 bg-[#e35e25] rounded-full ml-0.5" />
                    </div>

                    {/* QR code - with tile frame */}
                    {!isCancelled && (
                        <div className="bg-white border border-gray-200 rounded-xl p-2">
                            <QRComponent
                                value={qrValue}
                                size={80}
                                level="H"
                                includeMargin={false}
                                fgColor="#15383c"
                                bgColor="#ffffff"
                            />
                        </div>
                    )}
                </div>

                {/* Claim CTA for guests */}
                {showClaimCTA && onClaimClick && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                            onClick={onClaimClick}
                            className="w-full py-2.5 bg-gradient-to-r from-[#15383c] to-[#1f4d52] text-white rounded-xl font-semibold text-xs hover:from-[#1f4d52] hover:to-[#264f54] transition-all"
                        >
                            🚀 Create your Popera account
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketCardMock;
