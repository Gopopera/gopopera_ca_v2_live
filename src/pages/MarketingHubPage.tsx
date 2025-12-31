/**
 * Marketing Hub - Admin-only dashboard for sending mass emails
 * Accessible only to eatezca@gmail.com
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewState } from '../../types';
import { useUserStore } from '../../stores/userStore';
import { buildMarketingEmailHtml, type MarketingEmailParams } from '../lib/marketingEmailBuilder';
import { ChevronLeft, Send, Eye, Save, Copy, Mail, AlertTriangle, CheckCircle, Loader2, Smartphone } from 'lucide-react';
import { getDbSafe } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthInstance } from '../lib/firebaseAuth';

interface MarketingHubPageProps {
  setViewState: (view: ViewState) => void;
}

interface Campaign {
  id: string;
  campaignName: string;
  subject: string;
  preheader?: string;
  theme: 'dark' | 'light' | 'minimal';
  density: 'compact' | 'normal';
  heroImageUrl?: string;
  heroAlt?: string;
  markdownBody: string;
  ctaText?: string;
  ctaUrl?: string;
  audience: 'all' | 'hosts' | 'attendees';
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

const ADMIN_EMAIL = 'eatezca@gmail.com';

export const MarketingHubPage: React.FC<MarketingHubPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const authInitialized = useUserStore((state) => state.authInitialized);
  
  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light' | 'minimal'>('dark');
  const [density, setDensity] = useState<'compact' | 'normal'>('normal');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroAlt, setHeroAlt] = useState('');
  const [markdownBody, setMarkdownBody] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [audience, setAudience] = useState<'all' | 'hosts' | 'attendees'>('all');
  
  // UI state
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('dark');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [sampleEmails, setSampleEmails] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  
  // Build email params
  const emailParams: MarketingEmailParams = useMemo(() => ({
    subject,
    preheader: preheader || undefined,
    theme,
    density,
    heroImageUrl: heroImageUrl || undefined,
    heroAlt: heroAlt || undefined,
    markdownBody,
    ctaText: ctaText || undefined,
    ctaUrl: ctaUrl || undefined,
    campaignName: campaignName || undefined,
  }), [subject, preheader, theme, density, heroImageUrl, heroAlt, markdownBody, ctaText, ctaUrl, campaignName]);
  
  // Generate preview HTML
  const previewHtml = useMemo(() => {
    if (!markdownBody) return '';
    return buildMarketingEmailHtml(emailParams).html;
  }, [emailParams, markdownBody]);
  
  // Auth check
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  
  // Get Firebase ID token
  const getIdToken = async (): Promise<string> => {
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    return currentUser.getIdToken();
  };
  
  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    const db = getDbSafe();
    if (!db) return;
    
    try {
      const campaignsRef = collection(db, 'marketing_campaigns');
      const q = query(campaignsRef, orderBy('updatedAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Campaign));
      setCampaigns(loaded);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);
  
  useEffect(() => {
    if (isAdmin) {
      loadCampaigns();
    }
  }, [isAdmin, loadCampaigns]);
  
  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };
  
  // Save draft
  const handleSaveDraft = async () => {
    const db = getDbSafe();
    if (!db || !subject) {
      showNotification('error', 'Subject is required');
      return;
    }
    
    setSaving(true);
    try {
      const campaignData = {
        campaignName,
        subject,
        preheader,
        theme,
        density,
        heroImageUrl,
        heroAlt,
        markdownBody,
        ctaText,
        ctaUrl,
        audience,
        status: 'draft',
        createdByEmail: user?.email,
        updatedAt: serverTimestamp(),
      };
      
      if (currentCampaignId) {
        await updateDoc(doc(db, 'marketing_campaigns', currentCampaignId), campaignData);
        showNotification('success', 'Campaign updated!');
      } else {
        const docRef = await addDoc(collection(db, 'marketing_campaigns'), {
          ...campaignData,
          createdAt: serverTimestamp(),
        });
        setCurrentCampaignId(docRef.id);
        showNotification('success', 'Campaign saved as draft!');
      }
      
      loadCampaigns();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  
  // Load campaign into editor
  const handleLoadCampaign = (campaign: Campaign) => {
    setCampaignName(campaign.campaignName || '');
    setSubject(campaign.subject || '');
    setPreheader(campaign.preheader || '');
    setTheme(campaign.theme || 'dark');
    setDensity(campaign.density || 'normal');
    setHeroImageUrl(campaign.heroImageUrl || '');
    setHeroAlt(campaign.heroAlt || '');
    setMarkdownBody(campaign.markdownBody || '');
    setCtaText(campaign.ctaText || '');
    setCtaUrl(campaign.ctaUrl || '');
    setAudience(campaign.audience || 'all');
    setCurrentCampaignId(campaign.id);
  };
  
  // Duplicate campaign
  const handleDuplicate = (campaign: Campaign) => {
    handleLoadCampaign(campaign);
    setCurrentCampaignId(null); // Create as new
    setCampaignName((campaign.campaignName || 'Campaign') + ' (Copy)');
  };
  
  // Send test email
  const handleSendTest = async () => {
    if (!subject || !markdownBody) {
      showNotification('error', 'Subject and body are required');
      return;
    }
    
    setSendingTest(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/marketing/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(emailParams),
      });
      
      const result = await response.json();
      if (result.success) {
        showNotification('success', `Test email sent to ${ADMIN_EMAIL}!`);
      } else {
        throw new Error(result.error || 'Failed to send test');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to send test');
    } finally {
      setSendingTest(false);
    }
  };
  
  // Fetch recipient count
  const handleFetchRecipientCount = async () => {
    if (!subject || !markdownBody) {
      showNotification('error', 'Subject and body are required');
      return;
    }
    
    try {
      const token = await getIdToken();
      const response = await fetch('/api/marketing/recipients-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ audience }),
      });
      
      const result = await response.json();
      if (result.success) {
        setRecipientCount(result.count);
        setSampleEmails(result.sampleMaskedEmails || []);
        setShowConfirmModal(true);
      } else {
        throw new Error(result.error || 'Failed to fetch count');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to fetch recipients');
    }
  };
  
  // Send bulk campaign
  const handleSendBulk = async () => {
    if (confirmInput.toUpperCase() !== 'SEND') {
      showNotification('error', 'Type SEND to confirm');
      return;
    }
    
    setSendingBulk(true);
    setShowConfirmModal(false);
    
    try {
      const token = await getIdToken();
      const response = await fetch('/api/marketing/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...emailParams,
          audience,
          campaignId: currentCampaignId,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        showNotification('success', `Campaign sent! ${result.sentCount || 0} delivered, ${result.failedCount || 0} failed.`);
        loadCampaigns();
      } else {
        throw new Error(result.error || 'Failed to send campaign');
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to send campaign');
    } finally {
      setSendingBulk(false);
      setConfirmInput('');
    }
  };
  
  // Clear form
  const handleNewCampaign = () => {
    setCampaignName('');
    setSubject('');
    setPreheader('');
    setTheme('dark');
    setDensity('normal');
    setHeroImageUrl('');
    setHeroAlt('');
    setMarkdownBody('');
    setCtaText('');
    setCtaUrl('');
    setAudience('all');
    setCurrentCampaignId(null);
  };
  
  // Auth guard
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#15383c]" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-24 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-[#15383c] mb-2">Sign In Required</h1>
          <p className="text-gray-600">Please sign in to access the Marketing Hub.</p>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-24 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-[#15383c] mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is restricted to administrators only.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-24 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {notification.message}
        </div>
      )}
      
      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-[#15383c] mb-4">Confirm Send</h3>
            <p className="text-gray-600 mb-4">
              You are about to send this campaign to <strong>{recipientCount}</strong> recipients.
            </p>
            {sampleEmails.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-2">Sample recipients:</p>
                {sampleEmails.map((email, i) => (
                  <p key={i} className="text-sm text-gray-700">{email}</p>
                ))}
              </div>
            )}
            <p className="text-gray-600 mb-4">
              Type <strong>SEND</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-[#e35e25]"
              placeholder="Type SEND"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirmModal(false); setConfirmInput(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulk}
                disabled={confirmInput.toUpperCase() !== 'SEND' || sendingBulk}
                className="flex-1 px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingBulk ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setViewState(ViewState.FEED)}
            className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#15383c]">Marketing Hub</h1>
            <p className="text-gray-500 text-sm">Send newsletters and announcements</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Composer */}
          <div className="space-y-4">
            {/* Campaign History */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#15383c]">Recent Campaigns</h3>
                <button onClick={handleNewCampaign} className="text-sm text-[#e35e25] hover:underline">
                  + New
                </button>
              </div>
              {loadingCampaigns ? (
                <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
              ) : campaigns.length === 0 ? (
                <p className="text-gray-500 text-sm">No campaigns yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {campaigns.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#15383c] truncate">{c.subject || 'Untitled'}</p>
                        <p className="text-xs text-gray-500">{c.status}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleLoadCampaign(c)} className="p-1 text-gray-500 hover:text-[#15383c]" title="Edit">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDuplicate(c)} className="p-1 text-gray-500 hover:text-[#15383c]" title="Duplicate">
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Composer Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <h3 className="font-semibold text-[#15383c]">Compose Email</h3>
              
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name (internal)</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                  placeholder="e.g., January Newsletter"
                />
              </div>
              
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                  placeholder="Your email subject"
                />
              </div>
              
              {/* Preheader */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preheader</label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                  placeholder="Preview text shown in inbox"
                />
              </div>
              
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'minimal'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        theme === t ? 'bg-[#15383c] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'dark' ? 'Popera Dark' : t === 'light' ? 'Popera Light' : 'Minimal'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Density */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Density</label>
                <div className="flex gap-2">
                  {(['normal', 'compact'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensity(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                        density === d ? 'bg-[#15383c] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Hero Image */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                  <input
                    type="url"
                    value={heroImageUrl}
                    onChange={(e) => setHeroImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={heroAlt}
                    onChange={(e) => setHeroAlt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                    placeholder="Image description"
                  />
                </div>
              </div>
              
              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body (Markdown) *</label>
                <textarea
                  value={markdownBody}
                  onChange={(e) => setMarkdownBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] h-40 font-mono text-sm"
                  placeholder={"Write your email content here...\n\n**Bold text** and *italic*\n[Link text](https://...)\n- Bullet point"}
                />
              </div>
              
              {/* CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                    placeholder="e.g., Explore Events"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                    placeholder="https://gopopera.ca/..."
                  />
                </div>
              </div>
              
              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as 'all' | 'hosts' | 'attendees')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                >
                  <option value="all">All opted-in users</option>
                  <option value="hosts">Hosts only</option>
                  <option value="attendees">Attendees only</option>
                </select>
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Draft
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest || !subject || !markdownBody}
                  className="flex items-center gap-2 px-4 py-2 border border-[#15383c] text-[#15383c] rounded-lg hover:bg-[#15383c] hover:text-white disabled:opacity-50"
                >
                  {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Send Test to Me
                </button>
                <button
                  onClick={handleFetchRecipientCount}
                  disabled={sendingBulk || !subject || !markdownBody}
                  className="flex items-center gap-2 px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50"
                >
                  {sendingBulk ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send Campaign
                </button>
              </div>
            </div>
          </div>
          
          {/* RIGHT: Mobile Preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-gray-500" />
                  <h3 className="font-semibold text-[#15383c]">Mobile Preview</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewMode('light')}
                    className={`px-2 py-1 text-xs rounded ${previewMode === 'light' ? 'bg-gray-200' : 'bg-gray-100'}`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setPreviewMode('dark')}
                    className={`px-2 py-1 text-xs rounded ${previewMode === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>
              
              {/* Phone Frame */}
              <div className={`mx-auto rounded-[32px] p-2 max-w-[390px] ${previewMode === 'dark' ? 'bg-gray-900' : 'bg-gray-200'}`}>
                <div className="rounded-[24px] overflow-hidden bg-white" style={{ height: '600px' }}>
                  {/* Status Bar */}
                  <div className={`h-6 flex items-center justify-center text-[10px] ${previewMode === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Preview
                  </div>
                  
                  {/* Email Content */}
                  <div className="overflow-y-auto" style={{ height: 'calc(100% - 24px)' }}>
                    {previewHtml ? (
                      <iframe
                        srcDoc={previewHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, '#unsubscribe')}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Email Preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                          <Mail size={32} className="mx-auto mb-2" />
                          <p className="text-sm">Start typing to see preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

