import React, { useState } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, Upload, X, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';
import { uploadImage } from '../firebase/storage';

interface ReportPageProps {
  setViewState: (view: ViewState) => void;
}

type ReportCategory = 'Bug' | 'Abuse/Safety' | 'Payment/RSVP' | 'Host issue' | 'Other';

export const ReportPage: React.FC<ReportPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [category, setCategory] = useState<ReportCategory>('Bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [eventUrl, setEventUrl] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be less than 5MB');
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required');
      return;
    }

    if (description.length > 5000) {
      setError('Description must be 5000 characters or less');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload screenshot if provided
      let screenshotUrl: string | undefined;
      if (screenshot) {
        const path = `reports/${Date.now()}-${screenshot.name}`;
        screenshotUrl = await uploadImage(path, screenshot);
      }

      // Write to Firestore
      const reportData = {
        id: '', // Will be set by Firestore
        uid: user?.uid || null,
        displayName: user?.displayName || user?.name || null,
        category,
        subject: subject.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim() || user?.email || null,
        eventUrl: eventUrl.trim() || null,
        screenshotUrl: screenshotUrl || null,
        userAgent: navigator.userAgent,
        path: window.location.pathname,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'reports'), reportData);
      
      // Call email API endpoint
      // TODO: Create /api/report endpoint that:
      // - Accepts POST with report data
      // - Sends email to support@gopopera.ca using mail provider (e.g., SendGrid, Resend, etc.)
      // - Implements basic rate limiting by uid/ip
      // - Uses env vars: SUPPORT_EMAIL, MAIL_API_KEY
      try {
        const response = await fetch('/api/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportId: docRef.id,
            ...reportData,
          }),
        });

        if (!response.ok) {
          console.warn('Email API call failed, but report was saved to Firestore');
        }
      } catch (emailError) {
        console.warn('Email API error (report still saved):', emailError);
        // Don't fail the whole submission if email fails
      }

      setSubmitted(true);
      
      // Reset form
      setTimeout(() => {
        setCategory('Bug');
        setSubject('');
        setDescription('');
        setEventUrl('');
        setContactEmail(user?.email || '');
        setScreenshot(null);
        setScreenshotPreview(null);
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting report:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button 
            onClick={() => setViewState(ViewState.LANDING)} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#15383c] mb-3">
              Report Submitted
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for your report. We'll review it and get back to you at {contactEmail || user?.email}.
            </p>
            <button
              onClick={() => setViewState(ViewState.LANDING)}
              className="px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 text-[#15383c]">
            Report an Issue
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Help us improve Popera by reporting bugs, safety concerns, or other issues.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-12 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#15383c] transition-all"
            >
              <option value="Bug">Bug</option>
              <option value="Abuse/Safety">Abuse/Safety</option>
              <option value="Payment/RSVP">Payment/RSVP</option>
              <option value="Host issue">Host issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
              placeholder="Brief description of the issue"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={5000}
              rows={6}
              placeholder="Please provide as much detail as possible..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#15383c] transition-all resize-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {description.length} / 5000 characters
            </div>
          </div>

          {/* Event URL */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              Event URL (optional)
            </label>
            <input
              type="url"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              placeholder="https://gopopera.ca/events/..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              Screenshot (optional, max 5MB)
            </label>
            {screenshotPreview ? (
              <div className="relative">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="w-full max-w-md rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setViewState(ViewState.LANDING)}
              className="flex-1 px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
