/**
 * Marketing Hub - Admin-only dashboard for sending mass emails + Lead Finder CRM
 * Accessible only to eatezca@gmail.com
 * 
 * Phase 1: Campaigns (existing) + Outreach Templates + Leads CRM
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewState } from '../../types';
import { useUserStore } from '../../stores/userStore';
import { buildMarketingEmailHtml, type MarketingEmailParams } from '../lib/marketingEmailBuilder';
import {
  ChevronLeft, Send, Eye, Save, Copy, Mail, AlertTriangle, CheckCircle,
  Loader2, Smartphone, Plus, Trash2, Edit3, X, Users, FileText,
  Building2, MapPin, Phone, Globe, Instagram, MessageSquare, Clock,
  Filter, Search, ChevronDown, ExternalLink, StickyNote, Upload, BookOpen, Link, Globe2
} from 'lucide-react';
import { getDbSafe } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthInstance } from '../lib/firebaseAuth';
import {
  listOutreachTemplates,
  createOutreachTemplate,
  updateOutreachTemplate,
  deleteOutreachTemplate,
  listLeads,
  createLead,
  updateLead,
  bulkUpdateLeadStatus,
  addLeadNote,
  getLeadActivities,
  getExistingEmails,
  type ListLeadsFilters
} from '../../firebase/leads';
import type { OutreachTemplate, Lead, LeadActivity, LeadStatus } from '../../firebase/types';

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

// Tab types for Marketing Hub navigation
type MarketingHubTab = 'campaigns' | 'templates' | 'leads' | 'blog';

// Lead categories matching Popera's circle taxonomy
const LEAD_CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'yoga_studio', label: 'Yoga Studios' },
  { key: 'fitness_gym', label: 'Fitness & Gyms' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'cafe', label: 'Cafés & Coffee Shops' },
  { key: 'art_gallery', label: 'Art Galleries' },
  { key: 'music_venue', label: 'Music Venues' },
  { key: 'community_center', label: 'Community Centers' },
  { key: 'coworking', label: 'Coworking Spaces' },
  { key: 'wellness', label: 'Wellness & Spa' },
  { key: 'bookstore', label: 'Bookstores' },
  { key: 'other', label: 'Other' },
] as const;

// Lead status options with colors
const LEAD_STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { key: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'replied', label: 'Replied', color: 'bg-purple-100 text-purple-700' },
  { key: 'qualified', label: 'Qualified', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'booked', label: 'Booked', color: 'bg-cyan-100 text-cyan-700' },
  { key: 'created', label: 'Created', color: 'bg-orange-100 text-orange-700' },
  { key: 'published', label: 'Published', color: 'bg-green-100 text-green-700' },
  { key: 'not_interested', label: 'Not Interested', color: 'bg-gray-100 text-gray-600' },
  { key: 'closed', label: 'Closed', color: 'bg-red-100 text-red-700' },
];

export const MarketingHubPage: React.FC<MarketingHubPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const authInitialized = useUserStore((state) => state.authInitialized);

  // Tab state
  const [activeTab, setActiveTab] = useState<MarketingHubTab>('campaigns');

  // Form state (Campaigns)
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

  // UI state (Campaigns)
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

  // Templates state
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [wasAdminWhenModalOpened, setWasAdminWhenModalOpened] = useState(false); // Prevent modal closing on auth flicker
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    categoryKey: 'yoga_studio',
    subject: '',
    preheader: '',
    markdownBody: '',
    theme: 'dark' as 'dark' | 'light' | 'minimal',
    ctaText: '',
    ctaUrl: '',
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadFilters, setLeadFilters] = useState<ListLeadsFilters>({});
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkStatusValue, setBulkStatusValue] = useState<LeadStatus>('contacted');
  const [newNote, setNewNote] = useState('');
  const [savingLead, setSavingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    businessName: '',
    categoryKey: 'yoga_studio',
    leadType: '',
    city: '',
    address: '',
    website: '',
    phone: '',
    email: '',
    contactFormUrl: '',
    igHandle: '',
    status: 'new' as LeadStatus,
    notes: '',
  });

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRunning, setImportRunning] = useState(false);
  const [importForm, setImportForm] = useState({
    categoryKey: 'restaurant',
    leadType: 'restaurant',
    city: 'Montreal, QC',
    query: 'restaurants',
    radiusKm: 10,
    minRating: 4.3,
    minReviews: 100,
    targetLeads: 100,
    maxCandidates: 250,
  });
  const [importResult, setImportResult] = useState<{
    success: boolean;
    error?: string;
    created: number;
    scanned: number;
    skippedNoWebsite: number;
    skippedNoEmail: number;
    skippedDedupe: number;
    skippedCached: number;
    stoppedReason: string;
    report: Array<{
      placeId: string;
      name: string;
      website?: string;
      outcome: string;
      email?: string;
    }>;
  } | null>(null);

  // Send outreach modal state
  const [showSendOutreachModal, setShowSendOutreachModal] = useState(false);
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [outreachResult, setOutreachResult] = useState<{
    success: boolean;
    sent: number;
    failed: number;
    skipped: number;
    results: Array<{
      leadId: string;
      businessName: string;
      email?: string;
      outcome: 'sent' | 'failed' | 'skipped';
      reason?: string;
    }>;
  } | null>(null);

  // CSV Import state
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedData, setCsvParsedData] = useState<Array<{
    businessName: string;
    email: string;
    city: string;
    phone?: string;
    website?: string;
    address?: string;
  }>>([]);
  const [csvCategoryKey, setCsvCategoryKey] = useState('restaurant');
  const [csvLeadType, setCsvLeadType] = useState('');
  const [csvDuplicateEmails, setCsvDuplicateEmails] = useState<Set<string>>(new Set());
  const [csvImportResult, setCsvImportResult] = useState<{
    success: boolean;
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // Blog state
  const [blogTopicsInput, setBlogTopicsInput] = useState('');
  const [blogContextInput, setBlogContextInput] = useState('');
  const [blogVariants, setBlogVariants] = useState(1); // Locked to 1 draft per topic
  const [blogGenerating, setBlogGenerating] = useState(false);
  const [blogGeneratedDrafts, setBlogGeneratedDrafts] = useState<Array<{
    title: string;
    slug: string;
    excerpt: string;
    metaTitle: string;
    metaDescription: string;
    contentHtml: string;
    tags: string[];
    status: string;
    createdAt: number;
    updatedAt: number;
    topicId?: string;
    variantLabel?: string;
  }>>([]);
  const [blogImportUrl, setBlogImportUrl] = useState('');
  const [blogImporting, setBlogImporting] = useState(false);
  const [blogImportedDraft, setBlogImportedDraft] = useState<{
    title: string;
    slug: string;
    excerpt: string;
    metaTitle: string;
    metaDescription: string;
    contentHtml: string;
    tags: string[];
    status: string;
    createdAt: number;
    updatedAt: number;
    sourceUrl?: string;
    attribution?: string;
    canonicalUrl?: string;
  } | null>(null);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [blogPreviewDraft, setBlogPreviewDraft] = useState<any | null>(null);

  // Blog Edit Draft modal state
  const [blogEditDraft, setBlogEditDraft] = useState<any | null>(null);
  const [blogEditSaving, setBlogEditSaving] = useState(false);
  const [blogEditForm, setBlogEditForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    metaTitle: '',
    metaDescription: '',
    tags: '',
    heroImageUrl: '',
    contentHtml: '',
  });

  // Blog Publish state
  const [blogPublishing, setBlogPublishing] = useState<number | null>(null); // index of draft being published
  const [blogPublishedSlugs, setBlogPublishedSlugs] = useState<Map<number, string>>(new Map()); // index -> published slug

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

  // DEBUG: Log auth state (always runs)
  console.log('[MarketingHub] Auth state:', {
    userEmail: user?.email,
    adminEmail: ADMIN_EMAIL,
    isAdmin,
    authInitialized
  });

  // Get Firebase ID token (force refresh to ensure validity)
  const getIdToken = async (): Promise<string> => {
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[MarketingHub] No currentUser - user not authenticated');
      throw new Error('You must be logged in to perform this action');
    }
    console.log('[MarketingHub] Getting token for:', currentUser.email);
    const token = await currentUser.getIdToken(true); // force refresh
    console.log('[MarketingHub] Token obtained, length:', token.length);
    return token;
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

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const categoryFilter = templateCategoryFilter === 'all' ? undefined : templateCategoryFilter;
      const loaded = await listOutreachTemplates(categoryFilter);
      setTemplates(loaded);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [templateCategoryFilter]);

  useEffect(() => {
    if (isAdmin && activeTab === 'templates') {
      loadTemplates();
    }
  }, [isAdmin, activeTab, loadTemplates]);

  // Load leads
  const loadLeads = useCallback(async () => {
    console.log('[MarketingHub] loadLeads() called with filters:', leadFilters);
    setLoadingLeads(true);
    try {
      const loaded = await listLeads(leadFilters);
      console.log('[MarketingHub] listLeads returned:', loaded.length, 'leads');
      setLeads(loaded);
    } catch (error) {
      console.error('[MarketingHub] Error loading leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  }, [leadFilters]);

  useEffect(() => {
    console.log('[MarketingHub] Leads useEffect triggered:', { isAdmin, activeTab });
    if (isAdmin && activeTab === 'leads') {
      console.log('[MarketingHub] Conditions met, calling loadLeads()');
      loadLeads();
    } else {
      console.log('[MarketingHub] Conditions NOT met, skipping loadLeads()');
    }
  }, [isAdmin, activeTab, loadLeads]);

  // Escape key handler for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTemplateModal) {
          setShowTemplateModal(false);
          setWasAdminWhenModalOpened(false);
        }
        if (showLeadModal) { setShowLeadModal(false); setWasAdminWhenModalOpened(false); }
        if (showSendOutreachModal) { setShowSendOutreachModal(false); setWasAdminWhenModalOpened(false); }
        if (showConfirmModal) { setShowConfirmModal(false); setWasAdminWhenModalOpened(false); }
        if (showImportModal) { setShowImportModal(false); setWasAdminWhenModalOpened(false); }
        if (showCsvImportModal) { setShowCsvImportModal(false); setWasAdminWhenModalOpened(false); }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showTemplateModal, showLeadModal, showSendOutreachModal, showConfirmModal, showImportModal, showCsvImportModal]);

  // Template handlers
  const handleOpenTemplateModal = (template?: OutreachTemplate) => {
    // Lock admin status when modal opens to prevent auth flicker from closing it
    setWasAdminWhenModalOpened(isAdmin);

    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        categoryKey: template.categoryKey,
        subject: template.subject,
        preheader: template.preheader || '',
        markdownBody: template.markdownBody,
        theme: template.theme,
        ctaText: template.ctaText || '',
        ctaUrl: template.ctaUrl || '',
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        categoryKey: 'yoga_studio',
        subject: '',
        preheader: '',
        markdownBody: 'Hi {{business_name}},\n\nI noticed your {{category}} in {{city}} and thought you might be interested in hosting a circle on Popera.\n\n**What is Popera?**\nPopera is a platform where local businesses host intimate community gatherings (3-50 people).\n\nWould you be open to a quick chat?\n\nBest,\nThe Popera Team',
        theme: 'dark',
        ctaText: 'Learn More',
        ctaUrl: 'https://gopopera.ca',
      });
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.markdownBody) {
      showNotification('error', 'Name, subject and body are required');
      return;
    }

    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        await updateOutreachTemplate(editingTemplate.id, templateForm);
        showNotification('success', 'Template updated!');
      } else {
        await createOutreachTemplate({
          ...templateForm,
          createdByEmail: user?.email || '',
        });
        showNotification('success', 'Template created!');
      }
      setShowTemplateModal(false);
      setWasAdminWhenModalOpened(false);
      loadTemplates();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteOutreachTemplate(templateId);
      showNotification('success', 'Template deleted');
      loadTemplates();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = (template: OutreachTemplate) => {
    setEditingTemplate(null);
    setTemplateForm({
      name: template.name + ' (Copy)',
      categoryKey: template.categoryKey,
      subject: template.subject,
      preheader: template.preheader || '',
      markdownBody: template.markdownBody,
      theme: template.theme,
      ctaText: template.ctaText || '',
      ctaUrl: template.ctaUrl || '',
    });
    setShowTemplateModal(true);
  };

  // Template preview HTML
  const templatePreviewHtml = useMemo(() => {
    if (!templateForm.markdownBody) return '';
    return buildMarketingEmailHtml({
      subject: templateForm.subject || 'Preview',
      markdownBody: templateForm.markdownBody,
      theme: templateForm.theme,
      density: 'normal',
      ctaText: templateForm.ctaText || undefined,
      ctaUrl: templateForm.ctaUrl || undefined,
    }).html;
  }, [templateForm]);

  // Lead handlers
  const handleOpenLeadModal = async (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setLeadForm({
        businessName: lead.businessName,
        categoryKey: lead.categoryKey,
        leadType: lead.leadType,
        city: lead.city,
        address: lead.address || '',
        website: lead.website || '',
        phone: lead.phone || '',
        email: lead.email || '',
        contactFormUrl: lead.contactFormUrl || '',
        igHandle: lead.igHandle || '',
        status: lead.status,
        notes: lead.notes || '',
      });
      // Load activities
      setLoadingActivities(true);
      try {
        const activities = await getLeadActivities(lead.id);
        setLeadActivities(activities);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoadingActivities(false);
      }
    } else {
      setEditingLead(null);
      setLeadForm({
        businessName: '',
        categoryKey: 'yoga_studio',
        leadType: '',
        city: '',
        address: '',
        website: '',
        phone: '',
        email: '',
        contactFormUrl: '',
        igHandle: '',
        status: 'new',
        notes: '',
      });
      setLeadActivities([]);
    }
    setNewNote('');
    setWasAdminWhenModalOpened(isAdmin);
    setShowLeadModal(true);
  };

  const handleSaveLead = async () => {
    if (!leadForm.businessName || !leadForm.city) {
      showNotification('error', 'Business name and city are required');
      return;
    }

    setSavingLead(true);
    try {
      if (editingLead) {
        await updateLead(editingLead.id, leadForm, user?.email || '');
        showNotification('success', 'Lead updated!');
      } else {
        await createLead(
          { ...leadForm, source: 'manual' },
          user?.email || ''
        );
        showNotification('success', 'Lead created!');
      }
      setShowLeadModal(false);
      setWasAdminWhenModalOpened(false);
      loadLeads();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to save lead');
    } finally {
      setSavingLead(false);
    }
  };

  const handleAddNote = async () => {
    if (!editingLead || !newNote.trim()) return;

    try {
      await addLeadNote(editingLead.id, newNote.trim(), user?.email || '');
      setNewNote('');
      // Reload activities
      const activities = await getLeadActivities(editingLead.id);
      setLeadActivities(activities);
      showNotification('success', 'Note added');
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to add note');
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedLeadIds.size === 0) {
      showNotification('error', 'Select at least one lead');
      return;
    }

    try {
      const result = await bulkUpdateLeadStatus(
        Array.from(selectedLeadIds),
        bulkStatusValue,
        user?.email || ''
      );
      showNotification('success', `Updated ${result.success} leads`);
      setSelectedLeadIds(new Set());
      loadLeads();
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to update leads');
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
    }
  };

  // Import leads handler
  const handleRunImport = async () => {
    setImportRunning(true);
    setImportResult(null);

    try {
      const token = await getIdToken();

      const response = await fetch('/api/leads/import-with-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(importForm),
      });

      const rawText = await response.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON response: ${rawText.substring(0, 100)}...`);
      }

      if (result.success) {
        setImportResult(result);
        showNotification('success', `Import complete: ${result.created} leads created`);
      } else {
        // Show error in modal instead of just toast
        setImportResult({
          success: false,
          error: result.error || 'Import failed',
          created: 0,
          scanned: 0,
          skippedNoWebsite: 0,
          skippedNoEmail: 0,
          skippedDedupe: 0,
          skippedCached: 0,
          stoppedReason: 'error',
          report: [],
        });
        showNotification('error', result.error || 'Import failed');
      }
    } catch (error: any) {
      console.error('[MarketingHub] Import error:', error);
      // Show error in modal
      setImportResult({
        success: false,
        error: error.message || 'Import failed',
        created: 0,
        scanned: 0,
        skippedNoWebsite: 0,
        skippedNoEmail: 0,
        skippedDedupe: 0,
        skippedCached: 0,
        stoppedReason: 'error',
        report: [],
      });
      showNotification('error', error.message || 'Import failed');
    } finally {
      setImportRunning(false);
    }
  };

  // Open send outreach modal
  const handleOpenSendOutreach = async () => {
    setOutreachResult(null);
    setSelectedTemplateId('');
    // Load templates if not already loaded
    if (templates.length === 0) {
      setLoadingTemplates(true);
      try {
        const loaded = await listOutreachTemplates();
        setTemplates(loaded);
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    }
    setWasAdminWhenModalOpened(isAdmin);
    setShowSendOutreachModal(true);
  };

  // Send outreach emails to selected leads
  const handleSendOutreach = async () => {
    if (selectedLeadIds.size === 0) {
      showNotification('error', 'Select at least one lead');
      return;
    }
    if (!selectedTemplateId) {
      showNotification('error', 'Please select a template');
      return;
    }

    setSendingOutreach(true);
    setOutreachResult(null);

    try {
      const token = await getIdToken();
      const allLeadIds = Array.from(selectedLeadIds);
      const BATCH_SIZE = 200;

      // Split into batches of 200 (API limit)
      const batches: string[][] = [];
      for (let i = 0; i < allLeadIds.length; i += BATCH_SIZE) {
        batches.push(allLeadIds.slice(i, i + BATCH_SIZE));
      }

      let totalSent = 0;
      let totalFailed = 0;
      let totalSkipped = 0;
      const allResults: any[] = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        showNotification('info', `Sending batch ${batchIndex + 1}/${batches.length} (${batch.length} leads)...`);

        const response = await fetch('/api/leads/send-outreach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            leadIds: batch,
            templateId: selectedTemplateId,
          }),
        });

        const rawText = await response.text();
        let result;
        try {
          result = JSON.parse(rawText);
        } catch {
          throw new Error(`Server returned non-JSON response: ${rawText.substring(0, 100)}...`);
        }

        if (result.success) {
          totalSent += result.sent || 0;
          totalFailed += result.failed || 0;
          totalSkipped += result.skipped || 0;
          if (result.results) allResults.push(...result.results);
        } else {
          throw new Error(result.error || `Batch ${batchIndex + 1} failed`);
        }
      }

      // Combine results
      setOutreachResult({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        skipped: totalSkipped,
        results: allResults,
      });
      showNotification('success', `Sent ${totalSent} emails, ${totalSkipped} skipped, ${totalFailed} failed`);
      // Clear selection after successful send
      setSelectedLeadIds(new Set());
      // Reload leads to show updated lastContactedAt
      loadLeads();
    } catch (error: any) {
      console.error('[MarketingHub] Send outreach error:', error);
      showNotification('error', error.message || 'Failed to send outreach');
    } finally {
      setSendingOutreach(false);
    }
  };

  // CSV Import: Parse CSV file
  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Helper function to parse a CSV line (handles quoted values)
    const parseLine = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      return values;
    };

    // Parse header row with quote-aware logic
    const headerLine = lines[0];
    const headers = parseLine(headerLine).map(h => h.toLowerCase());

    // Parse data rows
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse line with quote-aware logic
      const values = parseLine(line);

      // Map values to headers
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  // CSV Import: Smart column finder - finds a value from any matching column
  const findColumnValue = (row: Record<string, string>, patterns: string[]): string => {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
      // First try exact match (lowercase)
      if (row[pattern]) {
        return row[pattern];
      }
      // Then try case-insensitive partial match
      const matchingKey = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
      if (matchingKey && row[matchingKey]) return row[matchingKey];
    }
    return '';
  };

  // CSV Import: Smart name extractor from email
  const extractNameFromEmail = (email: string): string => {
    if (!email || !email.includes('@')) return '';

    const [localPart, domain] = email.split('@');
    const domainName = domain.split('.')[0];

    // If local part is generic (info, admin, contact, hello, etc.), use domain name
    const genericPrefixes = ['info', 'admin', 'contact', 'hello', 'support', 'sales', 'team', 'office', 'booking', 'bookings', 'reservations', 'events', 'marketing', 'news', 'media', 'press', 'hr', 'careers', 'jobs', 'help', 'customer', 'service'];

    if (genericPrefixes.includes(localPart.toLowerCase())) {
      // Capitalize domain name nicely
      return domainName.charAt(0).toUpperCase() + domainName.slice(1).toLowerCase();
    }

    // Otherwise, try to make a name from local part
    // Handle formats like: john.doe, john_doe, johndoe
    const cleanedLocal = localPart
      .replace(/[._-]/g, ' ')
      .replace(/\d+/g, '')
      .trim();

    if (cleanedLocal.length > 1) {
      // Capitalize each word
      return cleanedLocal
        .split(' ')
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // Fallback to domain
    return domainName.charAt(0).toUpperCase() + domainName.slice(1).toLowerCase();
  };

  // CSV Import: Map column names to standard fields (SMART VERSION)
  const mapCsvRow = (row: Record<string, string>): {
    businessName: string;
    email: string;
    city: string;
    phone?: string;
    website?: string;
    address?: string;
  } | null => {
    // SMART EMAIL DETECTION - find any column containing "email" or "mail"
    let email = findColumnValue(row, ['email', 'e-mail', 'mail', 'e-mail 1 - value', 'email address', 'primary email', 'work email', 'personal email']);

    // FALLBACK: If no email found via patterns, scan ALL values for @ symbol
    if (!email || !email.includes('@')) {
      const allValues = Object.values(row);
      for (const val of allValues) {
        if (val && typeof val === 'string' && val.includes('@') && val.includes('.')) {
          email = val.trim();
          break;
        }
      }
    }

    // Skip if no valid email
    if (!email || !email.includes('@')) {
      return null;
    }

    // SMART NAME DETECTION - combine multiple name columns if present
    const firstName = findColumnValue(row, ['first name', 'firstname', 'first', 'given name', 'prénom']);
    const middleName = findColumnValue(row, ['middle name', 'middlename', 'middle']);
    const lastName = findColumnValue(row, ['last name', 'lastname', 'last', 'surname', 'family name', 'nom']);
    const fullName = findColumnValue(row, ['name', 'full name', 'fullname', 'display name', 'displayname']);
    const company = findColumnValue(row, ['company', 'organization', 'organisation', 'business', 'businessname', 'business name', 'organization name']);

    // Build the name from available parts
    let businessName = '';

    // Priority 1: Combined first/middle/last name
    const combinedName = [firstName, middleName, lastName].filter(n => n.trim()).join(' ').trim();
    if (combinedName) {
      businessName = combinedName;
    }
    // Priority 2: Full name field
    else if (fullName) {
      businessName = fullName;
    }
    // Priority 3: Company/organization name
    else if (company) {
      businessName = company;
    }
    // Priority 4: Extract from email address
    else {
      businessName = extractNameFromEmail(email);
    }

    // Skip if still no name (shouldn't happen with email fallback, but safety check)
    if (!businessName) {
      return null;
    }

    // SMART CITY DETECTION
    const city = findColumnValue(row, ['city', 'location', 'ville', 'town', 'municipality', 'address city']);

    // SMART PHONE DETECTION
    const phone = findColumnValue(row, ['phone', 'telephone', 'tel', 'phone number', 'mobile', 'cell', 'phone 1 - value', 'work phone', 'home phone']);

    // SMART WEBSITE DETECTION
    const website = findColumnValue(row, ['website', 'url', 'site', 'web', 'homepage', 'website url']);

    // SMART ADDRESS DETECTION
    const address = findColumnValue(row, ['address', 'street', 'adresse', 'street address', 'address 1', 'full address']);

    return {
      businessName: businessName.trim(),
      email: email.toLowerCase().trim(),
      city: city.trim() || 'Unknown',
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      address: address.trim() || undefined,
    };
  };

  // CSV Import: Handle file selection
  const handleCsvFileSelect = async (file: File) => {
    setCsvFile(file);
    setCsvImportResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      // Map and filter rows
      const mapped = rows
        .map(mapCsvRow)
        .filter((r): r is NonNullable<typeof r> => r !== null);

      setCsvParsedData(mapped);

      // Check for duplicates
      if (mapped.length > 0) {
        const emails = mapped.map(r => r.email);
        const existing = await getExistingEmails(emails);
        setCsvDuplicateEmails(existing);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      showNotification('error', 'Failed to parse CSV file');
    }
  };

  // CSV Import: Handle import
  const handleCsvImport = async () => {
    if (csvParsedData.length === 0) {
      showNotification('error', 'No valid data to import');
      return;
    }
    if (!csvCategoryKey) {
      showNotification('error', 'Please select a category');
      return;
    }

    setCsvImporting(true);
    setCsvImportResult(null);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const now = Date.now();

      for (const row of csvParsedData) {
        // Skip duplicates
        if (csvDuplicateEmails.has(row.email.toLowerCase())) {
          skipped++;
          continue;
        }

        try {
          await createLead({
            businessName: row.businessName,
            email: row.email,
            city: row.city || 'Unknown',
            phone: row.phone,
            website: row.website,
            address: row.address,
            categoryKey: csvCategoryKey,
            leadType: csvLeadType || csvCategoryKey,
            status: 'new',
            source: 'csv_import',
            notes: '',
          }, user?.email || 'admin');
          created++;
        } catch (err) {
          console.error('Failed to create lead:', err);
          failed++;
        }
      }

      setCsvImportResult({ success: true, created, skipped, failed });
      showNotification('success', `Imported ${created} leads (${skipped} duplicates skipped)`);

      // Reload leads list
      loadLeads();

    } catch (error: any) {
      console.error('CSV import error:', error);
      showNotification('error', error.message || 'Import failed');
    } finally {
      setCsvImporting(false);
    }
  };

  // CSV Import: Reset modal
  const resetCsvImport = () => {
    setCsvFile(null);
    setCsvParsedData([]);
    setCsvDuplicateEmails(new Set());
    setCsvImportResult(null);
    setCsvCategoryKey('restaurant');
    setCsvLeadType('');
  };

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

  // Blog: Generate drafts from topics
  const handleBlogGenerate = async () => {
    setBlogError(null);
    setBlogGeneratedDrafts([]);

    const lines = blogTopicsInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setBlogError('Enter at least one topic');
      return;
    }

    setBlogGenerating(true);

    try {
      const token = await getIdToken();
      const topics = lines.map(title => ({ title, context: blogContextInput || undefined }));

      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ topics, variants: 1 }), // Always 1 draft per topic
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON: ${rawText.substring(0, 100)}...`);
      }

      if (result.success && Array.isArray(result.drafts)) {
        setBlogGeneratedDrafts(result.drafts);
        showNotification('success', `Generated ${result.drafts.length} draft(s)`);
      } else {
        throw new Error(result.error || 'Failed to generate drafts');
      }
    } catch (error: any) {
      console.error('[MarketingHub] Blog generate error:', error);
      setBlogError(error.message || 'Failed to generate');
    } finally {
      setBlogGenerating(false);
    }
  };

  // Blog: Import from URL
  const handleBlogImport = async () => {
    setBlogError(null);
    setBlogImportedDraft(null);

    if (!blogImportUrl.trim()) {
      setBlogError('Enter a URL to import');
      return;
    }

    setBlogImporting(true);

    try {
      const token = await getIdToken();

      const response = await fetch('/api/blog/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url: blogImportUrl.trim() }),
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON: ${rawText.substring(0, 100)}...`);
      }

      if (result.success && result.draft) {
        setBlogImportedDraft(result.draft);
        showNotification('success', 'Draft imported successfully');
      } else {
        throw new Error(result.error || 'Failed to import');
      }
    } catch (error: any) {
      console.error('[MarketingHub] Blog import error:', error);
      setBlogError(error.message || 'Failed to import');
    } finally {
      setBlogImporting(false);
    }
  };

  // Blog: Copy draft JSON to clipboard
  const handleCopyDraftJson = (draft: any) => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    showNotification('success', 'Copied to clipboard');
  };

  // Blog: Open edit modal for a draft
  const handleOpenEditDraft = (draft: any, index: number) => {
    setBlogEditDraft({ ...draft, _index: index });
    setBlogEditForm({
      title: draft.title || '',
      slug: draft.slug || '',
      excerpt: draft.excerpt || '',
      metaTitle: draft.metaTitle || '',
      metaDescription: draft.metaDescription || '',
      tags: (draft.tags || []).join(', '),
      heroImageUrl: draft.heroImageUrl || '',
      contentHtml: draft.contentHtml || '',
    });
  };

  // Blog: Save edited draft (persists to Firestore via API)
  const handleSaveEditDraft = async () => {
    if (!blogEditDraft) return;
    setBlogEditSaving(true);
    setBlogError(null);

    try {
      const updatedDraft = {
        ...blogEditDraft,
        title: blogEditForm.title,
        slug: blogEditForm.slug,
        excerpt: blogEditForm.excerpt,
        metaTitle: blogEditForm.metaTitle,
        metaDescription: blogEditForm.metaDescription,
        tags: blogEditForm.tags.split(',').map(t => t.trim()).filter(t => t),
        heroImageUrl: blogEditForm.heroImageUrl,
        contentHtml: blogEditForm.contentHtml,
        updatedAt: Date.now(),
      };

      // Persist to Firestore via API
      const token = await getIdToken();
      const response = await fetch('/api/blog/save-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          draft: updatedDraft,
          draftId: blogEditDraft.id || blogEditDraft.draftId || undefined,
        }),
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON: ${rawText.substring(0, 100)}...`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save draft');
      }

      // Update local drafts array with returned draftId
      const index = blogEditDraft._index;
      if (typeof index === 'number' && index >= 0) {
        setBlogGeneratedDrafts(prev => {
          const newDrafts = [...prev];
          newDrafts[index] = { ...updatedDraft, draftId: result.draftId };
          return newDrafts;
        });
      }

      showNotification('success', 'Draft saved to Firestore');
      setBlogEditDraft(null);
    } catch (error: any) {
      console.error('[MarketingHub] Edit draft error:', error);
      setBlogError(error.message || 'Failed to save draft');
    } finally {
      setBlogEditSaving(false);
    }
  };

  // Blog: Publish a draft to blog_posts
  const handlePublishDraft = async (draft: any, index: number) => {
    setBlogPublishing(index);
    setBlogError(null);

    try {
      const token = await getIdToken();

      // Prefer draftId if available (persisted draft), otherwise send full draft payload
      const publishPayload = draft.draftId
        ? { draftId: draft.draftId }
        : { draft };

      const response = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(publishPayload),
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned non-JSON: ${rawText.substring(0, 100)}...`);
      }

      if (result.success && result.slug) {
        setBlogPublishedSlugs(prev => new Map(prev).set(index, result.slug));
        showNotification('success', `Published! View at /blog/${result.slug}`);
      } else {
        throw new Error(result.error || 'Failed to publish');
      }
    } catch (error: any) {
      console.error('[MarketingHub] Publish error:', error);
      setBlogError(error.message || 'Failed to publish');
    } finally {
      setBlogPublishing(null);
    }
  };

  /**
   * VALIDATION CHECKLIST for "Send Test to Me":
   * 1. Must be logged in as eatezca@gmail.com
   * 2. Fill in Subject and Body fields
   * 3. Click "Send Test to Me" button
   * 4. Expected: Green toast "Test email sent to eatezca@gmail.com!"
   * 5. If red toast with error: Check browser console for details
   * 6. If "Unexpected token" error: API returned HTML instead of JSON - check Vercel logs
   */
  const handleSendTest = async () => {
    if (!subject || !markdownBody) {
      showNotification('error', 'Subject and body are required');
      return;
    }

    setSendingTest(true);
    try {
      // Get Firebase ID token for admin auth
      const token = await getIdToken();
      console.log('[MarketingHub] Sending test email, auth token obtained');

      const response = await fetch('/api/marketing/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(emailParams),
      });

      // Read response as text first to handle non-JSON responses
      const rawText = await response.text();
      console.log('[MarketingHub] Response status:', response.status);
      console.log('[MarketingHub] Response body:', rawText.substring(0, 500));

      // Try to parse as JSON
      let result: { success?: boolean; error?: string; messageId?: string };
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        // Response is not JSON - likely HTML error page
        console.error('[MarketingHub] Failed to parse response as JSON:', rawText.substring(0, 1000));
        throw new Error(`Server returned non-JSON response (${response.status}): ${rawText.substring(0, 100)}...`);
      }

      if (result.success) {
        showNotification('success', `Test email sent to ${ADMIN_EMAIL}!`);
      } else {
        throw new Error(result.error || 'Failed to send test');
      }
    } catch (error: any) {
      console.error('[MarketingHub] handleSendTest error:', error);
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

      if (import.meta.env.DEV) {
        console.debug('[MarketingHub] Fetching recipient count, auth token attached');
      }

      const response = await fetch('/api/marketing/recipients-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ audience }),
      });

      // Read response as text first to handle non-JSON responses
      const rawText = await response.text();

      if (import.meta.env.DEV) {
        console.debug('[MarketingHub] Recipients count response status:', response.status);
        console.debug('[MarketingHub] Recipients count response body:', rawText.substring(0, 500));
      }

      // Try to parse as JSON
      let result: { success?: boolean; error?: string; reason?: string; count?: number; sampleMaskedEmails?: string[] };
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        console.error('[MarketingHub] Failed to parse response as JSON:', rawText.substring(0, 1000));
        throw new Error(`Server returned non-JSON response (${response.status}): ${rawText.substring(0, 100)}...`);
      }

      if (result.success) {
        setRecipientCount(result.count ?? 0);
        setSampleEmails(result.sampleMaskedEmails || []);
        setWasAdminWhenModalOpened(isAdmin);
        setShowConfirmModal(true);
      } else {
        throw new Error(result.error || result.reason || 'Failed to fetch count');
      }
    } catch (error: any) {
      console.error('[MarketingHub] handleFetchRecipientCount error:', error);
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
    setWasAdminWhenModalOpened(false);

    try {
      const token = await getIdToken();

      if (import.meta.env.DEV) {
        console.debug('[MarketingHub] Sending bulk campaign, auth token attached');
      }

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

      // Read response as text first to handle non-JSON responses
      const rawText = await response.text();

      if (import.meta.env.DEV) {
        console.debug('[MarketingHub] Bulk send response status:', response.status);
        console.debug('[MarketingHub] Bulk send response body:', rawText.substring(0, 500));
      }

      // Try to parse as JSON
      let result: { success?: boolean; error?: string; reason?: string; sentCount?: number; failedCount?: number };
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        console.error('[MarketingHub] Failed to parse response as JSON:', rawText.substring(0, 1000));
        throw new Error(`Server returned non-JSON response (${response.status}): ${rawText.substring(0, 100)}...`);
      }

      if (result.success) {
        showNotification('success', `Campaign sent! ${result.sentCount || 0} delivered, ${result.failedCount || 0} failed.`);
        loadCampaigns();
      } else {
        throw new Error(result.error || result.reason || 'Failed to send campaign');
      }
    } catch (error: any) {
      console.error('[MarketingHub] handleSendBulk error:', error);
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

  // Auth guard - but allow page to stay open if a modal was opened when user was admin
  // This prevents auth state flicker from closing modals mid-edit
  const hasActiveModal = showTemplateModal || showLeadModal || showSendOutreachModal || showConfirmModal || showImportModal || showCsvImportModal;
  const allowAccess = isAdmin || (hasActiveModal && wasAdminWhenModalOpened);

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#15383c]" />
      </div>
    );
  }

  if (!user && !hasActiveModal) {
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

  if (!allowAccess) {
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
        <div className={`fixed top-24 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
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
                onClick={() => { setShowConfirmModal(false); setWasAdminWhenModalOpened(false); setConfirmInput(''); }}
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

      {/* Template Editor Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          {/* Backdrop - separate element for reliable click detection */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowTemplateModal(false); setWasAdminWhenModalOpened(false); }}
            aria-hidden="true"
          />
          {/* Modal content - positioned above backdrop */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#15383c]">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={() => { setShowTemplateModal(false); setWasAdminWhenModalOpened(false); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex">
              {/* Form */}
              <div className="w-1/2 p-4 overflow-y-auto border-r border-gray-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input type="text" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                    placeholder="e.g., Yoga Studio Cold Email v1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={templateForm.categoryKey} onChange={e => setTemplateForm(f => ({ ...f, categoryKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]">
                    {LEAD_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input type="text" value={templateForm.subject} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                    placeholder="e.g., Host a circle at {{business_name}}" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preheader</label>
                  <input type="text" value={templateForm.preheader} onChange={e => setTemplateForm(f => ({ ...f, preheader: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                    placeholder="Preview text in inbox" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <div className="flex gap-2">
                    {(['dark', 'light', 'minimal'] as const).map(t => (
                      <button key={t} onClick={() => setTemplateForm(f => ({ ...f, theme: t }))}
                        className={`px-3 py-1.5 rounded-lg text-sm ${templateForm.theme === t ? 'bg-[#15383c] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Minimal'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body (Markdown) *</label>
                  <p className="text-xs text-gray-500 mb-1">Use {'{{business_name}}'}, {'{{city}}'}, {'{{category}}'} as placeholders</p>
                  <textarea value={templateForm.markdownBody} onChange={e => setTemplateForm(f => ({ ...f, markdownBody: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] h-48 font-mono text-sm"
                    placeholder="Write your email content..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                    <input type="text" value={templateForm.ctaText} onChange={e => setTemplateForm(f => ({ ...f, ctaText: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm" placeholder="Learn More" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                    <input type="url" value={templateForm.ctaUrl} onChange={e => setTemplateForm(f => ({ ...f, ctaUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm" placeholder="https://gopopera.ca" />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="w-1/2 p-4 bg-gray-50 overflow-y-auto">
                <h3 className="font-medium text-gray-700 mb-3">Preview</h3>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '500px' }}>
                  {templatePreviewHtml ? (
                    <iframe srcDoc={templatePreviewHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="Template Preview" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p className="text-sm">Start typing to see preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowTemplateModal(false); setWasAdminWhenModalOpened(false); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveTemplate} disabled={savingTemplate}
                className="px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50 flex items-center gap-2">
                {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingTemplate ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setShowLeadModal(false); setWasAdminWhenModalOpened(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#15383c]">
                {editingLead ? 'Edit Lead' : 'Add Lead'}
              </h2>
              <button onClick={() => { setShowLeadModal(false); setWasAdminWhenModalOpened(false); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input type="text" value={leadForm.businessName} onChange={e => setLeadForm(f => ({ ...f, businessName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="Business name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input type="text" value={leadForm.city} onChange={e => setLeadForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="City" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={leadForm.categoryKey} onChange={e => setLeadForm(f => ({ ...f, categoryKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]">
                    {LEAD_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                  <input type="text" value={leadForm.leadType} onChange={e => setLeadForm(f => ({ ...f, leadType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="e.g., hot yoga, vegan cafe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={leadForm.address} onChange={e => setLeadForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={leadForm.email} onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="contact@business.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="+1 (555) 123-4567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="url" value={leadForm.website} onChange={e => setLeadForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input type="text" value={leadForm.igHandle} onChange={e => setLeadForm(f => ({ ...f, igHandle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="@handle" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Form URL</label>
                <input type="url" value={leadForm.contactFormUrl} onChange={e => setLeadForm(f => ({ ...f, contactFormUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={leadForm.status} onChange={e => setLeadForm(f => ({ ...f, status: e.target.value as LeadStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]">
                  {LEAD_STATUSES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] h-20" placeholder="Internal notes..." />
              </div>

              {/* Activity Log (only for existing leads) */}
              {editingLead && (
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Clock size={16} /> Activity Log
                  </h3>
                  <div className="mb-3 flex gap-2">
                    <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                      placeholder="Add a note..." onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                    <button onClick={handleAddNote} disabled={!newNote.trim()}
                      className="px-3 py-2 bg-[#15383c] text-white rounded-lg hover:bg-[#0f2a2d] disabled:opacity-50">
                      <StickyNote size={16} />
                    </button>
                  </div>
                  {loadingActivities ? (
                    <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
                  ) : leadActivities.length === 0 ? (
                    <p className="text-gray-500 text-sm">No activity yet</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {leadActivities.map(a => (
                        <div key={a.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">{a.description}</span>
                            <span className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleDateString()}</span>
                          </div>
                          <span className="text-xs text-gray-400">{a.type} • {a.performedBy}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowLeadModal(false); setWasAdminWhenModalOpened(false); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveLead} disabled={savingLead}
                className="px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50 flex items-center gap-2">
                {savingLead ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingLead ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Leads Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !importRunning) { setShowImportModal(false); setWasAdminWhenModalOpened(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#15383c]">Import Leads (with emails)</h2>
              <button onClick={() => { if (!importRunning) { setShowImportModal(false); setWasAdminWhenModalOpened(false); } }} disabled={importRunning} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!importResult ? (
                <>
                  <p className="text-sm text-gray-600">
                    Search Google Places for businesses, crawl their websites to find emails, and import only leads with valid email addresses.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select value={importForm.categoryKey} onChange={e => setImportForm(f => ({ ...f, categoryKey: e.target.value }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100">
                        {LEAD_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                      <input type="text" value={importForm.leadType} onChange={e => setImportForm(f => ({ ...f, leadType: e.target.value }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100"
                        placeholder="e.g., sushi restaurant" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input type="text" value={importForm.city} onChange={e => setImportForm(f => ({ ...f, city: e.target.value }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100"
                        placeholder="Montreal, QC" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
                      <input type="text" value={importForm.query} onChange={e => setImportForm(f => ({ ...f, query: e.target.value }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100"
                        placeholder="restaurants" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
                      <input type="number" step="0.1" min="0" max="5" value={importForm.minRating}
                        onChange={e => setImportForm(f => ({ ...f, minRating: parseFloat(e.target.value) || 0 }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Reviews</label>
                      <input type="number" min="0" value={importForm.minReviews}
                        onChange={e => setImportForm(f => ({ ...f, minReviews: parseInt(e.target.value) || 0 }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
                      <input type="number" min="1" max="50" value={importForm.radiusKm}
                        onChange={e => setImportForm(f => ({ ...f, radiusKm: parseInt(e.target.value) || 10 }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Leads</label>
                      <input type="number" min="1" max="500" value={importForm.targetLeads}
                        onChange={e => setImportForm(f => ({ ...f, targetLeads: parseInt(e.target.value) || 100 }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Candidates</label>
                      <input type="number" min="1" max="500" value={importForm.maxCandidates}
                        onChange={e => setImportForm(f => ({ ...f, maxCandidates: parseInt(e.target.value) || 250 }))}
                        disabled={importRunning} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] disabled:bg-gray-100" />
                    </div>
                  </div>
                  {importRunning && (
                    <div className="flex items-center justify-center gap-3 py-6 bg-gray-50 rounded-lg">
                      <Loader2 className="w-6 h-6 animate-spin text-[#e35e25]" />
                      <span className="text-gray-600">Running import... This may take a few minutes.</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Error State */}
                  {!importResult.success && importResult.error ? (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Import Failed
                      </h3>
                      <p className="text-red-700 text-sm">{importResult.error}</p>
                    </div>
                  ) : (
                    /* Success State */
                    <>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-800 mb-2">Import Complete</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-green-700 font-medium">{importResult.created}</span>
                            <span className="text-gray-600 ml-1">Created</span>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">{importResult.scanned}</span>
                            <span className="text-gray-600 ml-1">Scanned</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">{importResult.skippedNoEmail}</span>
                            <span className="text-gray-600 ml-1">No Email</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">{importResult.skippedNoWebsite}</span>
                            <span className="text-gray-600 ml-1">No Website</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">{importResult.skippedDedupe}</span>
                            <span className="text-gray-600 ml-1">Duplicates</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">{importResult.skippedCached}</span>
                            <span className="text-gray-600 ml-1">Cached</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Stopped: {importResult.stoppedReason.replace(/_/g, ' ')}</p>
                      </div>

                      {importResult.report.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Report ({importResult.report.length} entries)</h4>
                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-600">Outcome</th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {importResult.report.slice(0, 100).map((item, i) => (
                                  <tr key={i} className={item.outcome === 'CREATED' ? 'bg-green-50' : ''}>
                                    <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{item.name}</td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.outcome === 'CREATED' ? 'bg-green-100 text-green-700' :
                                        item.outcome === 'NO_EMAIL' ? 'bg-yellow-100 text-yellow-700' :
                                          item.outcome === 'NO_WEBSITE' ? 'bg-gray-100 text-gray-600' :
                                            item.outcome === 'DUPLICATE' ? 'bg-blue-100 text-blue-700' :
                                              'bg-gray-100 text-gray-600'
                                        }`}>{item.outcome}</span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{item.email || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              {!importResult ? (
                <>
                  <button onClick={() => setShowImportModal(false)} disabled={importRunning}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                  <button onClick={handleRunImport} disabled={importRunning || !importForm.city || !importForm.query}
                    className="px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50 flex items-center gap-2">
                    {importRunning ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                    {importRunning ? 'Importing...' : 'Run Import'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setImportResult(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Run Another</button>
                  <button onClick={() => { setShowImportModal(false); loadLeads(); }}
                    className="px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] flex items-center gap-2">
                    <CheckCircle size={16} />
                    Done & Refresh
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Outreach Modal */}
      {showSendOutreachModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !sendingOutreach) { setShowSendOutreachModal(false); setWasAdminWhenModalOpened(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#15383c]">Send Outreach Email</h2>
              <button onClick={() => { if (!sendingOutreach) { setShowSendOutreachModal(false); setWasAdminWhenModalOpened(false); } }} disabled={sendingOutreach} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {!outreachResult ? (
                <>
                  {/* Recipients info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-700 font-medium">
                      Sending to {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? 's' : ''}
                    </p>
                    <p className="text-blue-600 text-sm mt-1">
                      Leads without valid email addresses will be skipped.
                    </p>
                  </div>

                  {/* Template selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outreach Template *</label>
                    {loadingTemplates ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        Loading templates...
                      </div>
                    ) : templates.length === 0 ? (
                      <p className="text-gray-500 text-sm">No templates found. Create one in the Templates tab first.</p>
                    ) : (
                      <select
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e35e25] focus:border-transparent"
                      >
                        <option value="">Select a template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.categoryKey})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Template preview (lightweight) */}
                  {selectedTemplateId && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-2 font-medium">TEMPLATE PREVIEW</p>
                      {(() => {
                        const tpl = templates.find(t => t.id === selectedTemplateId);
                        if (!tpl) return null;
                        // Get first selected lead for preview
                        const firstLead = leads.find(l => selectedLeadIds.has(l.id));
                        const previewBizName = firstLead?.businessName || '{{business_name}}';
                        const previewCity = firstLead?.city || '{{city}}';
                        const previewSubject = tpl.subject
                          .replace(/\{\{business_name\}\}/gi, previewBizName)
                          .replace(/\{\{city\}\}/gi, previewCity)
                          .replace(/\{\{category\}\}/gi, tpl.categoryKey);
                        const previewBody = tpl.markdownBody
                          .replace(/\{\{business_name\}\}/gi, previewBizName)
                          .replace(/\{\{city\}\}/gi, previewCity)
                          .replace(/\{\{category\}\}/gi, tpl.categoryKey);
                        return (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-gray-500">Subject: </span>
                              <span className="text-sm text-gray-700">{previewSubject}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Theme: </span>
                              <span className="text-sm text-gray-700 capitalize">{tpl.theme}</span>
                            </div>
                            <div className="text-sm text-gray-600 max-h-32 overflow-auto whitespace-pre-wrap border-t border-gray-200 pt-2 mt-2">
                              {previewBody.substring(0, 300)}{previewBody.length > 300 ? '...' : ''}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                // Results
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${outreachResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className="font-semibold text-lg mb-2">
                      {outreachResult.success ? '✅ Outreach Complete' : '❌ Error'}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{outreachResult.sent}</p>
                        <p className="text-xs text-gray-600">Sent</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-500">{outreachResult.skipped}</p>
                        <p className="text-xs text-gray-600">Skipped</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{outreachResult.failed}</p>
                        <p className="text-xs text-gray-600">Failed</p>
                      </div>
                    </div>
                  </div>

                  {/* Results table */}
                  <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">Business</th>
                          <th className="text-left px-3 py-2">Email</th>
                          <th className="text-left px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {outreachResult.results.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{r.businessName}</td>
                            <td className="px-3 py-2 text-gray-500">{r.email || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.outcome === 'sent' ? 'bg-green-100 text-green-800' :
                                r.outcome === 'skipped' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                {r.outcome}
                              </span>
                              {r.reason && <span className="text-xs text-gray-500 ml-1">({r.reason})</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              {!outreachResult ? (
                <>
                  <button
                    onClick={() => { setShowSendOutreachModal(false); setWasAdminWhenModalOpened(false); }}
                    disabled={sendingOutreach}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendOutreach}
                    disabled={sendingOutreach || !selectedTemplateId || templates.length === 0}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingOutreach ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send to {selectedLeadIds.size} Lead{selectedLeadIds.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowSendOutreachModal(false); setWasAdminWhenModalOpened(false); }}
                  className="px-4 py-2 bg-[#15383c] text-white rounded-lg hover:bg-[#0e2628]"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !csvImporting) { setShowCsvImportModal(false); setWasAdminWhenModalOpened(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#15383c]">Import Leads from CSV</h2>
              <button onClick={() => { if (!csvImporting) { setShowCsvImportModal(false); setWasAdminWhenModalOpened(false); } }} disabled={csvImporting} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {!csvImportResult ? (
                <>
                  {/* File upload area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCsvFileSelect(file);
                      }}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <label htmlFor="csv-file-input" className="cursor-pointer">
                      <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600">
                        {csvFile ? csvFile.name : 'Click to select CSV file'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Required: name + email (city, phone, website optional)
                      </p>
                    </label>
                  </div>

                  {/* Category and Lead Type */}
                  {csvParsedData.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                          <select
                            value={csvCategoryKey}
                            onChange={e => setCsvCategoryKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="restaurant">Restaurant</option>
                            <option value="yoga_studio">Yoga Studio</option>
                            <option value="fitness">Fitness</option>
                            <option value="wellness">Wellness</option>
                            <option value="cafe">Café</option>
                            <option value="bar">Bar</option>
                            <option value="retail">Retail</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type (optional)</label>
                          <input
                            type="text"
                            value={csvLeadType}
                            onChange={e => setCsvLeadType(e.target.value)}
                            placeholder="e.g., fine_dining, hot_yoga"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Preview summary */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-700 font-medium">
                          {csvParsedData.length} leads parsed
                          {csvDuplicateEmails.size > 0 && (
                            <span className="text-blue-500 font-normal ml-2">
                              ({csvDuplicateEmails.size} duplicates will be skipped)
                            </span>
                          )}
                        </p>
                        <p className="text-blue-600 text-sm mt-1">
                          {csvParsedData.length - csvDuplicateEmails.size} new leads will be imported
                        </p>
                      </div>

                      {/* Preview table */}
                      <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2">Business</th>
                              <th className="text-left px-3 py-2">Email</th>
                              <th className="text-left px-3 py-2">City</th>
                              <th className="text-left px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {csvParsedData.slice(0, 10).map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2">{row.businessName}</td>
                                <td className="px-3 py-2 text-gray-500">{row.email}</td>
                                <td className="px-3 py-2 text-gray-500">{row.city || '—'}</td>
                                <td className="px-3 py-2">
                                  {csvDuplicateEmails.has(row.email.toLowerCase()) ? (
                                    <span className="text-xs text-orange-600">Duplicate</span>
                                  ) : (
                                    <span className="text-xs text-green-600">New</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvParsedData.length > 10 && (
                          <p className="text-center py-2 text-xs text-gray-500">
                            ...and {csvParsedData.length - 10} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                // Results
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="font-semibold text-lg mb-2">✅ Import Complete</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{csvImportResult.created}</p>
                        <p className="text-xs text-gray-600">Created</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-500">{csvImportResult.skipped}</p>
                        <p className="text-xs text-gray-600">Skipped (duplicates)</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{csvImportResult.failed}</p>
                        <p className="text-xs text-gray-600">Failed</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              {!csvImportResult ? (
                <>
                  <button
                    onClick={() => setShowCsvImportModal(false)}
                    disabled={csvImporting}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCsvImport}
                    disabled={csvImporting || csvParsedData.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {csvImporting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Import {csvParsedData.length - csvDuplicateEmails.size} Leads
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowCsvImportModal(false)}
                  className="px-4 py-2 bg-[#15383c] text-white rounded-lg hover:bg-[#0e2628]"
                >
                  Close
                </button>
              )}
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
            <p className="text-gray-500 text-sm">Campaigns, Templates & Lead CRM</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'campaigns' ? 'bg-white text-[#15383c] shadow-sm' : 'text-gray-600 hover:text-[#15383c]'
              }`}
          >
            <Mail size={16} className="inline mr-2" />
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-white text-[#15383c] shadow-sm' : 'text-gray-600 hover:text-[#15383c]'
              }`}
          >
            <FileText size={16} className="inline mr-2" />
            Outreach Templates
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-white text-[#15383c] shadow-sm' : 'text-gray-600 hover:text-[#15383c]'
              }`}
          >
            <Users size={16} className="inline mr-2" />
            Leads
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('blog')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'blog' ? 'bg-white text-[#15383c] shadow-sm' : 'text-gray-600 hover:text-[#15383c]'
                }`}
            >
              <BookOpen size={16} className="inline mr-2" />
              Blog
            </button>
          )}
        </div>

        {/* Campaigns Tab (existing) */}
        {activeTab === 'campaigns' && (
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
                        className={`px-3 py-1.5 rounded-lg text-sm ${theme === t ? 'bg-[#15383c] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${density === d ? 'bg-[#15383c] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <select
                  value={templateCategoryFilter}
                  onChange={e => setTemplateCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25]"
                >
                  {LEAD_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleOpenTemplateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a]"
              >
                <Plus size={16} />
                New Template
              </button>
            </div>

            {/* Templates Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingTemplates ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No templates yet. Create your first one!</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Subject</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Theme</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Updated</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {templates.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-[#15383c]">{t.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {LEAD_CATEGORIES.find(c => c.key === t.categoryKey)?.label || t.categoryKey}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{t.subject}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${t.theme === 'dark' ? 'bg-gray-800 text-white' :
                            t.theme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-white border text-gray-600'
                            }`}>{t.theme}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(t.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleOpenTemplateModal(t)} className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded" title="Edit">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDuplicateTemplate(t)} className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded" title="Duplicate">
                              <Copy size={14} />
                            </button>
                            <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={leadFilters.categoryKey || 'all'}
                onChange={e => setLeadFilters(f => ({ ...f, categoryKey: e.target.value === 'all' ? undefined : e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
              >
                {LEAD_CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <select
                value={leadFilters.status || ''}
                onChange={e => setLeadFilters(f => ({ ...f, status: e.target.value as LeadStatus || undefined }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={leadFilters.city || ''}
                onChange={e => setLeadFilters(f => ({ ...f, city: e.target.value || undefined }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm w-32"
                placeholder="City..."
              />
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={leadFilters.search || ''}
                  onChange={e => setLeadFilters(f => ({ ...f, search: e.target.value || undefined }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                  placeholder="Search businesses..."
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={() => { setWasAdminWhenModalOpened(isAdmin); setImportResult(null); setShowImportModal(true); }}
                className="flex items-center gap-2 px-4 py-2 border border-[#15383c] text-[#15383c] rounded-lg hover:bg-[#15383c] hover:text-white"
              >
                <Users size={16} />
                Import (API)
              </button>
              <button
                onClick={() => { setWasAdminWhenModalOpened(isAdmin); resetCsvImport(); setShowCsvImportModal(true); }}
                className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white"
              >
                <Upload size={16} />
                Import CSV
              </button>
              <button
                onClick={() => handleOpenLeadModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a]"
              >
                <Plus size={16} />
                Add Lead
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedLeadIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">{selectedLeadIds.size} selected</span>
                <select
                  value={bulkStatusValue}
                  onChange={e => setBulkStatusValue(e.target.value as LeadStatus)}
                  className="px-2 py-1 border border-blue-300 rounded text-sm"
                >
                  {LEAD_STATUSES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <button onClick={handleBulkStatusUpdate} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Update Status
                </button>
                <button onClick={handleOpenSendOutreach} className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 flex items-center gap-1">
                  <Mail size={14} />
                  Send Outreach
                </button>
                <button onClick={() => setSelectedLeadIds(new Set())} className="text-sm text-blue-600 hover:underline">
                  Clear
                </button>
              </div>
            )}

            {/* Leads Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingLeads ? (
                <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
              ) : leads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No leads yet. Add your first one!</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input type="checkbox" checked={selectedLeadIds.size === leads.length && leads.length > 0}
                          onChange={toggleSelectAll} className="rounded border-gray-300" />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Business</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">City</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Source</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Updated</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map(lead => {
                      const statusInfo = LEAD_STATUSES.find(s => s.key === lead.status);
                      return (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedLeadIds.has(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)} className="rounded border-gray-300" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#15383c] text-sm">{lead.businessName}</div>
                            <div className="text-xs text-gray-500">
                              {LEAD_CATEGORIES.find(c => c.key === lead.categoryKey)?.label}
                              {lead.leadType && ` • ${lead.leadType}`}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{lead.city}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                              {statusInfo?.label || lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="text-[#e35e25] hover:underline">{lead.email}</a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">{lead.source}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(lead.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {lead.website && (
                                <a href={lead.website} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded" title="Website">
                                  <Globe size={14} />
                                </a>
                              )}
                              {lead.igHandle && (
                                <a href={`https://instagram.com/${lead.igHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded" title="Instagram">
                                  <Instagram size={14} />
                                </a>
                              )}
                              <button onClick={() => handleOpenLeadModal(lead)}
                                className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded" title="Edit">
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Stats Summary */}
            {leads.length > 0 && (
              <div className="flex gap-4 text-sm text-gray-500">
                <span>Total: {leads.length}</span>
                <span>New: {leads.filter(l => l.status === 'new').length}</span>
                <span>Contacted: {leads.filter(l => l.status === 'contacted').length}</span>
                <span>Qualified: {leads.filter(l => l.status === 'qualified').length}</span>
              </div>
            )}
          </div>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && isAdmin && (
          <div className="space-y-6">
            {/* Error display */}
            {blogError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertTriangle size={18} />
                {blogError}
                <button onClick={() => setBlogError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generate Drafts Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#15383c] mb-4 flex items-center gap-2">
                  <BookOpen size={18} />
                  Generate Blog Drafts
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topics (one per line)</label>
                    <textarea
                      value={blogTopicsInput}
                      onChange={(e) => setBlogTopicsInput(e.target.value)}
                      placeholder="How to host a great dinner circle&#10;Tips for first-time attendees&#10;Best venues for small gatherings in Montreal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] h-28 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shared Context (optional)</label>
                    <textarea
                      value={blogContextInput}
                      onChange={(e) => setBlogContextInput(e.target.value)}
                      placeholder="e.g., Focus on Montreal venues, mention Popera's community guidelines..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] h-20 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Drafts per topic</label>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500">
                        1 (fixed)
                      </div>
                    </div>

                    <button
                      onClick={handleBlogGenerate}
                      disabled={blogGenerating || !blogTopicsInput.trim()}
                      className="ml-auto px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50 flex items-center gap-2"
                    >
                      {blogGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              {/* Import from URL Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-[#15383c] mb-4 flex items-center gap-2">
                  <Link size={18} />
                  Import from URL
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Article URL</label>
                    <input
                      type="url"
                      value={blogImportUrl}
                      onChange={(e) => setBlogImportUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">We'll fetch and rewrite the content as an original Popera article</p>
                  </div>

                  <button
                    onClick={handleBlogImport}
                    disabled={blogImporting || !blogImportUrl.trim()}
                    className="px-4 py-2 bg-[#15383c] text-white rounded-lg hover:bg-[#0e2628] disabled:opacity-50 flex items-center gap-2"
                  >
                    {blogImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Import
                  </button>
                </div>

                {/* Imported Draft Preview */}
                {blogImportedDraft && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[#15383c]">Imported Draft</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCopyDraftJson(blogImportedDraft)}
                          className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded"
                          title="Copy JSON"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => setBlogPreviewDraft(blogPreviewDraft === blogImportedDraft ? null : blogImportedDraft)}
                          className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded"
                          title="Preview"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-sm">{blogImportedDraft.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{blogImportedDraft.slug}</p>
                      <p className="text-sm text-gray-600 mt-2">{blogImportedDraft.excerpt}</p>
                      {blogImportedDraft.attribution && (
                        <p className="text-xs text-gray-400 mt-2 italic">{blogImportedDraft.attribution}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Drafts Table */}
            {blogGeneratedDrafts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-[#15383c]">Generated Drafts ({blogGeneratedDrafts.length})</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Title</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Slug</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Variant</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Tags</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {blogGeneratedDrafts.map((draft, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#15383c] text-sm">{draft.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{draft.excerpt}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{draft.slug}</td>
                        <td className="px-4 py-3">
                          {draft.variantLabel && (
                            <span className="px-2 py-0.5 bg-[#e35e25]/10 text-[#e35e25] rounded text-xs font-medium">
                              {draft.variantLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {draft.tags?.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {blogPublishedSlugs.has(idx) ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Published</span>
                              <a
                                href={`/blog/${blogPublishedSlugs.get(idx)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#e35e25] hover:underline text-xs flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                View
                              </a>
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePublishDraft(draft, idx)}
                              disabled={blogPublishing === idx}
                              className="px-2 py-1 bg-[#15383c] text-white text-xs rounded hover:bg-[#0e2628] disabled:opacity-50 flex items-center gap-1"
                            >
                              {blogPublishing === idx ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Globe2 size={12} />
                              )}
                              Publish
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditDraft(draft, idx)}
                              className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleCopyDraftJson(draft)}
                              className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded"
                              title="Copy JSON"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => setBlogPreviewDraft(blogPreviewDraft === draft ? null : draft)}
                              className="p-1.5 text-gray-500 hover:text-[#15383c] hover:bg-gray-100 rounded"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Draft Preview Panel */}
            {blogPreviewDraft && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-[#15383c]">Preview: {blogPreviewDraft.title}</h3>
                  <button
                    onClick={() => setBlogPreviewDraft(null)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-4 pb-4 border-b border-gray-100 space-y-2">
                    <p className="text-sm"><span className="text-gray-500">SEO Title:</span> <span className="text-[#15383c] font-medium">{blogPreviewDraft.metaTitle}</span></p>
                    <p className="text-sm"><span className="text-gray-500">SEO Description:</span> <span className="text-[#15383c]">{blogPreviewDraft.metaDescription}</span></p>
                    <p className="text-sm"><span className="text-gray-500">Excerpt:</span> <span className="text-gray-700">{blogPreviewDraft.excerpt}</span></p>
                    {blogPreviewDraft.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {blogPreviewDraft.tags.map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <article
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: blogPreviewDraft.contentHtml }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Blog Edit Draft Modal */}
        {blogEditDraft && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-semibold text-[#15383c]">Edit Draft</h3>
                <button
                  onClick={() => setBlogEditDraft(null)}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={blogEditForm.title}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                  />
                </div>
                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={blogEditForm.slug}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm font-mono"
                  />
                </div>
                {/* Excerpt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                  <textarea
                    value={blogEditForm.excerpt}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, excerpt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm h-20"
                  />
                </div>
                {/* SEO Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={blogEditForm.metaTitle}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, metaTitle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                  />
                </div>
                {/* SEO Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                  <textarea
                    value={blogEditForm.metaDescription}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm h-16"
                  />
                </div>
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={blogEditForm.tags}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., hosting, tips, circles"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                  />
                </div>
                {/* Hero Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                  <input
                    type="text"
                    value={blogEditForm.heroImageUrl}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, heroImageUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm"
                  />
                </div>
                {/* Content HTML */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
                  <textarea
                    value={blogEditForm.contentHtml}
                    onChange={(e) => setBlogEditForm(prev => ({ ...prev, contentHtml: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e35e25] text-sm font-mono h-48"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
                <button
                  onClick={() => setBlogEditDraft(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditDraft}
                  disabled={blogEditSaving}
                  className="px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#d54d1a] disabled:opacity-50 flex items-center gap-2"
                >
                  {blogEditSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

