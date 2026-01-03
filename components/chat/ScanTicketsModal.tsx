import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, QrCode, CheckCircle2, XCircle, AlertCircle, Clock, Camera, CameraOff } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getReservationById, updateReservationCheckIn, getCheckedInCountForEvent } from '../../firebase/db';

interface ScanResult {
  id: string;
  timestamp: number;
  reservationId: string;
  status: 'success' | 'already_checked_in' | 'not_found' | 'wrong_event' | 'cancelled' | 'error';
  message: string;
  attendeeName?: string;
}

interface ScanTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  hostUid: string;
  eventTitle?: string;
}

export const ScanTicketsModal: React.FC<ScanTicketsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  hostUid,
  eventTitle,
}) => {
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial checked-in count
  useEffect(() => {
    if (isOpen && eventId) {
      getCheckedInCountForEvent(eventId)
        .then(setCheckedInCount)
        .catch(console.error);
    }
  }, [isOpen, eventId]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScannerEnabled(true);
      setCameraError(null);
      lastScannedRef.current = null;
      lastScanTimeRef.current = 0;
    }
  }, [isOpen]);

  /**
   * Parse reservation ID from various QR code formats:
   * - Full URL: https://popera.com/ticket/{reservationId}?mode=checkin
   * - Relative path: /ticket/{reservationId}
   * - Raw ID: {reservationId}
   */
  const parseReservationId = (raw: string): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    
    const trimmed = raw.trim();
    
    try {
      // Try parsing as full URL
      let url: URL;
      try {
        url = new URL(trimmed);
      } catch {
        // Try as relative URL
        url = new URL(trimmed, window.location.origin);
      }
      
      const pathParts = url.pathname.split('/').filter(Boolean);
      const ticketIndex = pathParts.findIndex(part => part === 'ticket');
      
      if (ticketIndex !== -1 && pathParts[ticketIndex + 1]) {
        return pathParts[ticketIndex + 1];
      }
    } catch {
      // Not a URL
    }
    
    // Fallback: check if it looks like a Firestore document ID
    // Firestore auto-generated IDs are 20 characters, alphanumeric
    if (/^[a-zA-Z0-9]{15,30}$/.test(trimmed)) {
      return trimmed;
    }
    
    return null;
  };

  /**
   * Handle QR code scan result
   */
  const handleScan = useCallback(async (result: string) => {
    const now = Date.now();
    
    // Debounce: prevent repeated scans of same code within 2 seconds
    if (
      lastScannedRef.current === result &&
      now - lastScanTimeRef.current < 2000
    ) {
      return;
    }
    
    // Skip if already processing
    if (isProcessing) return;
    
    lastScannedRef.current = result;
    lastScanTimeRef.current = now;
    
    const reservationId = parseReservationId(result);
    
    if (!reservationId) {
      addScanResult({
        reservationId: result.substring(0, 20) + '...',
        status: 'error',
        message: 'Invalid QR code format',
      });
      return;
    }
    
    setIsProcessing(true);
    setScannerEnabled(false);
    
    try {
      // Fetch reservation
      const reservation = await getReservationById(reservationId);
      
      if (!reservation) {
        addScanResult({
          reservationId,
          status: 'not_found',
          message: 'Ticket not found',
        });
        resumeScanning();
        return;
      }
      
      // Validate event
      if (reservation.eventId !== eventId) {
        addScanResult({
          reservationId,
          status: 'wrong_event',
          message: 'Ticket belongs to another event',
        });
        resumeScanning();
        return;
      }
      
      // Check if cancelled
      if (reservation.status === 'cancelled') {
        addScanResult({
          reservationId,
          status: 'cancelled',
          message: 'Ticket cancelled',
        });
        resumeScanning();
        return;
      }
      
      // Check if already checked in
      if (reservation.checkedInAt || reservation.status === 'checked_in') {
        addScanResult({
          reservationId,
          status: 'already_checked_in',
          message: 'Already checked in',
        });
        resumeScanning();
        return;
      }
      
      // Perform check-in
      await updateReservationCheckIn(reservationId, hostUid);
      
      addScanResult({
        reservationId,
        status: 'success',
        message: 'Checked in ✓',
      });
      
      // Re-fetch checked-in count from Firestore for accuracy
      getCheckedInCountForEvent(eventId)
        .then(setCheckedInCount)
        .catch(() => {
          // Fallback: increment locally if fetch fails
          setCheckedInCount(prev => prev + 1);
        });
      
      // Resume scanning after success (brief pause for feedback)
      resumeScanning(1500);
      
    } catch (error: any) {
      console.error('[SCAN_TICKETS] Check-in error:', error);
      addScanResult({
        reservationId,
        status: 'error',
        message: error.message || 'Check-in failed',
      });
      resumeScanning();
    }
  }, [eventId, hostUid, isProcessing]);

  /**
   * Add a scan result to history
   */
  const addScanResult = (result: Omit<ScanResult, 'id' | 'timestamp'>) => {
    const newResult: ScanResult = {
      ...result,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    setScanHistory(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10
    setIsProcessing(false);
  };

  /**
   * Resume scanning after a delay
   */
  const resumeScanning = (delay: number = 500) => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    pauseTimeoutRef.current = setTimeout(() => {
      setScannerEnabled(true);
      setIsProcessing(false);
    }, delay);
  };

  /**
   * Get status icon for scan result
   */
  const getStatusIcon = (status: ScanResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'already_checked_in':
        return <Clock size={16} className="text-amber-500" />;
      case 'not_found':
      case 'wrong_event':
      case 'cancelled':
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  /**
   * Get background color for scan result
   */
  const getStatusBg = (status: ScanResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'already_checked_in':
        return 'bg-amber-50 border-amber-200';
      case 'not_found':
      case 'wrong_event':
      case 'cancelled':
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Shorten reservation ID for display
   */
  const shortenId = (id: string) => {
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-end md:justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full md:w-[480px] h-[85vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-slide-up md:animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e35e25]/10 rounded-xl flex items-center justify-center">
              <QrCode size={22} className="text-[#e35e25]" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-[#15383c]">Scan Tickets</h2>
              {eventTitle && (
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{eventTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-5 py-3 bg-[#15383c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-sm font-medium">Checked in: <span className="font-bold">{checkedInCount}</span></span>
          </div>
          <div className="flex items-center gap-2">
            {scannerEnabled ? (
              <>
                <Camera size={16} className="text-green-400" />
                <span className="text-xs text-green-400">Camera active</span>
              </>
            ) : (
              <>
                <CameraOff size={16} className="text-amber-400" />
                <span className="text-xs text-amber-400">Processing...</span>
              </>
            )}
          </div>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Camera View */}
          <div className="relative bg-black aspect-square max-h-[300px] w-full shrink-0">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                <CameraOff size={48} className="text-gray-400 mb-4" />
                <p className="text-sm text-gray-300 mb-2">Camera access denied</p>
                <p className="text-xs text-gray-500">{cameraError}</p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setScannerEnabled(true);
                  }}
                  className="mt-4 px-4 py-2 bg-[#e35e25] text-white text-sm font-medium rounded-full hover:bg-[#d14e1a] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0 && result[0].rawValue) {
                      handleScan(result[0].rawValue);
                    }
                  }}
                  onError={(error) => {
                    console.error('[SCAN_TICKETS] Camera error:', error);
                    setCameraError(error?.message || 'Failed to access camera');
                  }}
                  paused={!scannerEnabled}
                  components={{
                    audio: false,
                    torch: true,
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '100%',
                    },
                    video: {
                      objectFit: 'cover',
                    },
                  }}
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#e35e25] rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#e35e25] rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#e35e25] rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#e35e25] rounded-br-lg"></div>
                  </div>
                  {/* Scanning line animation */}
                  {scannerEnabled && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 overflow-hidden">
                      <div className="h-0.5 bg-[#e35e25] animate-pulse"></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
            <p className="text-sm text-gray-600 text-center">
              Point your camera at an attendee's ticket QR code
            </p>
          </div>

          {/* Recent Scans */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Scans</h3>
            
            {scanHistory.length === 0 ? (
              <div className="text-center py-8">
                <QrCode size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No scans yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((scan) => (
                  <div
                    key={scan.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${getStatusBg(scan.status)}`}
                  >
                    {getStatusIcon(scan.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#15383c] truncate">
                        {scan.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {shortenId(scan.reservationId)} • {formatTime(scan.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-[#15383c] rounded-full font-semibold hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanTicketsModal;

