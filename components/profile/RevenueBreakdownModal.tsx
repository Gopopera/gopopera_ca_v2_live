import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import { getHostRevenueBreakdown, type EventRevenueBreakdown } from '../../firebase/db';
import { formatDate } from '../../utils/dateFormatter';

interface RevenueBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  totalRevenue: number;
}

export const RevenueBreakdownModal: React.FC<RevenueBreakdownModalProps> = ({
  isOpen,
  onClose,
  hostId,
  totalRevenue,
}) => {
  const [breakdown, setBreakdown] = useState<EventRevenueBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !hostId) return;

    const loadBreakdown = async () => {
      setLoading(true);
      try {
        const data = await getHostRevenueBreakdown(hostId);
        setBreakdown(data);
      } catch (error) {
        console.error('Error loading revenue breakdown:', error);
        setBreakdown([]);
      } finally {
        setLoading(false);
      }
    };

    loadBreakdown();
  }, [isOpen, hostId]);

  if (!isOpen) return null;

  // Filter to only show events with revenue
  const eventsWithRevenue = breakdown.filter(e => e.revenue > 0);

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" 
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-[#e35e25]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">Revenue Breakdown</h2>
              <p className="text-sm text-gray-500">Total: ${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#15383c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading breakdown...</p>
            </div>
          ) : eventsWithRevenue.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No revenue yet</p>
              <p className="text-sm text-gray-400 mt-2">Revenue from paid reservations will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsWithRevenue.map((event) => (
                <div
                  key={event.eventId}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#15383c]/20 transition-colors"
                >
                  {/* Event Title */}
                  <h3 className="font-heading font-bold text-[#15383c] mb-2 line-clamp-1">
                    {event.eventTitle}
                  </h3>
                  
                  {/* Event Details Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{event.eventDate ? formatDate(event.eventDate) : 'No date'}</span>
                    </div>
                    
                    {/* Capacity */}
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-gray-400" />
                      <span>
                        {event.maxCapacity 
                          ? `${event.currentCapacity}/${event.maxCapacity}`
                          : event.currentCapacity
                        }
                      </span>
                    </div>
                    
                    {/* Revenue */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <DollarSign size={14} className="text-[#e35e25]" />
                      <span className="font-bold text-[#15383c]">
                        ${event.revenue.toLocaleString()} {event.currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {eventsWithRevenue.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-gray-100/80 bg-gradient-to-r from-[#15383c] to-[#1a4549] rounded-b-3xl">
            <div className="flex items-center justify-between">
              <span className="text-white/80 font-medium">Total Revenue</span>
              <span className="text-2xl sm:text-3xl font-heading font-bold text-white">
                ${totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

