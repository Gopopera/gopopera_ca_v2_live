import React, { useState } from 'react';
import { X, Share2, Instagram, Link2, Download, Copy, Check } from 'lucide-react';
import { Event } from '../../types';
import { generateStoryImage, shareToInstagramStory } from '../../utils/generateStoryImage';
import { formatDate } from '../../utils/dateFormatter';

interface ShareModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ event, isOpen, onClose }) => {
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const eventUrl = window.location.origin + `/event/${event.id}`;

  // Copy link only - just the URL, no extra text
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = eventUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          onClose();
        }, 1500);
      } catch (e) {
        console.error('Fallback copy failed:', e);
      }
      document.body.removeChild(textArea);
    }
  };

  // Share via native share API (includes preview on supported platforms)
  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          url: eventUrl,
        });
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await handleCopyLink();
    }
  };

  const handleShareInstagramStory = async () => {
    try {
      setGenerating(true);
      setSharing(true);
      
      // Get event image
      const eventImageUrl = (event.imageUrls && event.imageUrls.length > 0) 
        ? event.imageUrls[0] 
        : (event.imageUrl || `https://picsum.photos/seed/${event.id}/1080/1920`);
      
      // Generate story image
      const storyImage = await generateStoryImage({
        eventImageUrl,
        eventTitle: event.title,
        eventCategory: event.category || 'Community',
        eventDate: formatDate(event.date),
        eventTime: event.time || '',
        eventLocation: event.location || event.city || '',
        eventPrice: event.price,
      });
      
      // Share to Instagram
      await shareToInstagramStory(storyImage, window.location.origin + `/event/${event.id}`);
      
      onClose();
    } catch (error) {
      console.error('Error sharing to Instagram Story:', error);
      alert('Failed to generate story image. Please try again.');
    } finally {
      setGenerating(false);
      setSharing(false);
    }
  };

  const handleDownloadStory = async () => {
    try {
      setGenerating(true);
      
      // Get event image
      const eventImageUrl = (event.imageUrls && event.imageUrls.length > 0) 
        ? event.imageUrls[0] 
        : (event.imageUrl || `https://picsum.photos/seed/${event.id}/1080/1920`);
      
      // Generate story image
      const storyImage = await generateStoryImage({
        eventImageUrl,
        eventTitle: event.title,
        eventCategory: event.category || 'Community',
        eventDate: formatDate(event.date),
        eventTime: event.time || '',
        eventLocation: event.location || event.city || '',
        eventPrice: event.price,
      });
      
      // Download image
      const url = URL.createObjectURL(storyImage);
      const a = document.createElement('a');
      a.href = url;
      a.download = `popera-story-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error('Error generating story image:', error);
      alert('Failed to generate story image. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 sm:px-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl border border-white/60 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100/80 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-heading font-bold text-popera-teal">Share Event</h3>
          <button onClick={onClose} className="p-2 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/60 rounded-full text-gray-500 transition-all shrink-0">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 sm:p-5 space-y-2.5">
          {/* Copy Link - Just copies the URL */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-3.5 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/60 rounded-xl transition-all text-left"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${copied ? 'bg-green-100' : 'bg-popera-teal/10'}`}>
              {copied ? (
                <Check size={24} className="text-green-600" />
              ) : (
                <Copy size={24} className="text-popera-teal" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-popera-teal">{copied ? 'Link Copied!' : 'Copy Link'}</h4>
              <p className="text-sm text-gray-500">{copied ? 'Ready to paste' : 'Copy the event link to clipboard'}</p>
            </div>
          </button>
          
          {/* Share via Apps (native share) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={handleShareLink}
              className="w-full flex items-center gap-3 p-3.5 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/60 rounded-xl transition-all text-left"
            >
              <div className="w-12 h-12 bg-popera-teal/10 rounded-full flex items-center justify-center shrink-0">
                <Share2 size={24} className="text-popera-teal" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-popera-teal">Share via Apps</h4>
                <p className="text-sm text-gray-500">Share to messages, social media & more</p>
              </div>
            </button>
          )}
          
          {/* Share to Instagram Story */}
          <button
            onClick={handleShareInstagramStory}
            disabled={generating || sharing}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              {generating || sharing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Instagram size={24} className="text-white" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-white">
                {generating ? 'Generating...' : sharing ? 'Sharing...' : 'Share to Instagram Story'}
              </h4>
              <p className="text-sm text-white/80">
                {generating ? 'Creating your story image' : sharing ? 'Opening Instagram...' : 'Create a story post'}
              </p>
            </div>
          </button>
          
          {/* Download Story Image */}
          <button
            onClick={handleDownloadStory}
            disabled={generating}
            className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 bg-popera-orange/10 rounded-full flex items-center justify-center shrink-0">
              {generating ? (
                <div className="w-6 h-6 border-2 border-popera-orange border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download size={24} className="text-popera-orange" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-popera-teal">
                {generating ? 'Generating...' : 'Download Story Image'}
              </h4>
              <p className="text-sm text-gray-500">
                {generating ? 'Creating your story image' : 'Save image to post manually'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

