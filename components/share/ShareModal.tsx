import React, { useState } from 'react';
import { X, Share2, Instagram, Link2, Download } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleShareLink = async () => {
    const url = window.location.origin + `/event/${event.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: url,
        });
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        onClose();
      } catch (err) {
        console.error('Failed to copy:', err);
      }
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-heading font-bold text-popera-teal">Share Event</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-3">
          {/* Share Link */}
          <button
            onClick={handleShareLink}
            className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
          >
            <div className="w-12 h-12 bg-popera-teal/10 rounded-full flex items-center justify-center shrink-0">
              <Link2 size={24} className="text-popera-teal" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-popera-teal">Share Link</h4>
              <p className="text-sm text-gray-500">Copy or share the event link</p>
            </div>
          </button>
          
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

