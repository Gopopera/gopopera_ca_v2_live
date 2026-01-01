/**
 * Lead Finder & Outreach CRM - Firestore CRUD Layer (Phase 1)
 * 
 * This module provides CRUD operations for:
 * - Outreach Templates
 * - Leads
 * - Lead Activities
 * 
 * Follows existing patterns from firebase/db.ts
 */

import { getDbSafe } from "../src/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  limit as firestoreLimit
} from "firebase/firestore";
import { 
  OutreachTemplate, 
  Lead, 
  LeadActivity, 
  LeadStatus, 
  LeadActivityType,
  LeadScanCache,
  ScanCacheResult
} from "./types";
import { sanitizeFirestoreData } from "../utils/firestoreValidation";

// ============================================
// Outreach Templates CRUD
// ============================================

/**
 * List all outreach templates, optionally filtered by category
 */
export async function listOutreachTemplates(categoryKey?: string): Promise<OutreachTemplate[]> {
  const db = getDbSafe();
  if (!db) {
    console.error('[LEADS] Firestore not initialized');
    return [];
  }

  try {
    const templatesCol = collection(db, 'outreach_templates');
    let q;
    
    if (categoryKey) {
      q = query(templatesCol, where('categoryKey', '==', categoryKey), orderBy('updatedAt', 'desc'));
    } else {
      q = query(templatesCol, orderBy('updatedAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as OutreachTemplate));
  } catch (error: any) {
    console.error('[LEADS] Error listing templates:', error);
    return [];
  }
}

/**
 * Get a single outreach template by ID
 */
export async function getOutreachTemplate(templateId: string): Promise<OutreachTemplate | null> {
  const db = getDbSafe();
  if (!db) return null;

  try {
    const templateRef = doc(db, 'outreach_templates', templateId);
    const snapshot = await getDoc(templateRef);
    
    if (!snapshot.exists()) return null;
    
    return {
      id: snapshot.id,
      ...snapshot.data()
    } as OutreachTemplate;
  } catch (error: any) {
    console.error('[LEADS] Error getting template:', error);
    return null;
  }
}

/**
 * Create a new outreach template
 */
export async function createOutreachTemplate(
  template: Omit<OutreachTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<OutreachTemplate> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const now = Date.now();
    const templateData = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };

    const sanitized = sanitizeFirestoreData(templateData);
    const templatesCol = collection(db, 'outreach_templates');
    const docRef = await addDoc(templatesCol, sanitized);

    console.log('[LEADS] ✅ Template created:', docRef.id);
    
    return {
      id: docRef.id,
      ...templateData,
    } as OutreachTemplate;
  } catch (error: any) {
    console.error('[LEADS] Error creating template:', error);
    throw error;
  }
}

/**
 * Update an existing outreach template
 */
export async function updateOutreachTemplate(
  templateId: string,
  patch: Partial<Omit<OutreachTemplate, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const templateRef = doc(db, 'outreach_templates', templateId);
    const updateData = {
      ...patch,
      updatedAt: Date.now(),
    };

    const sanitized = sanitizeFirestoreData(updateData);
    await updateDoc(templateRef, sanitized);

    console.log('[LEADS] ✅ Template updated:', templateId);
  } catch (error: any) {
    console.error('[LEADS] Error updating template:', error);
    throw error;
  }
}

/**
 * Delete an outreach template
 */
export async function deleteOutreachTemplate(templateId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const templateRef = doc(db, 'outreach_templates', templateId);
    await deleteDoc(templateRef);
    console.log('[LEADS] ✅ Template deleted:', templateId);
  } catch (error: any) {
    console.error('[LEADS] Error deleting template:', error);
    throw error;
  }
}

// ============================================
// Leads CRUD
// ============================================

export interface ListLeadsFilters {
  categoryKey?: string;
  status?: LeadStatus;
  city?: string;
  leadType?: string;
  search?: string; // Search by businessName
  limit?: number;
}

/**
 * List leads with optional filters
 */
export async function listLeads(filters: ListLeadsFilters = {}): Promise<Lead[]> {
  // Always log for debugging (temporary)
  console.log('[LEADS] listLeads called with filters:', filters);
  
  const db = getDbSafe();
  console.log('[LEADS] Firestore DB instance:', db ? 'OK' : 'NULL');
  
  if (!db) {
    console.error('[LEADS] Firestore not initialized');
    return [];
  }

  try {
    const leadsCol = collection(db, 'leads');
    
    // Build query constraints
    // Note: Firestore has limitations on compound queries, so we may need to filter client-side
    let q = query(leadsCol, orderBy('updatedAt', 'desc'));
    
    // Add category filter if specified
    if (filters.categoryKey) {
      console.log('[LEADS] Adding categoryKey filter:', filters.categoryKey);
      q = query(leadsCol, where('categoryKey', '==', filters.categoryKey), orderBy('updatedAt', 'desc'));
    }
    
    // Add status filter if specified (can combine with category)
    if (filters.status && !filters.categoryKey) {
      console.log('[LEADS] Adding status filter:', filters.status);
      q = query(leadsCol, where('status', '==', filters.status), orderBy('updatedAt', 'desc'));
    }
    
    // Add limit if specified
    if (filters.limit) {
      q = query(q, firestoreLimit(filters.limit));
    }

    console.log('[LEADS] Executing query...');
    const snapshot = await getDocs(q);
    console.log('[LEADS] Query returned', snapshot.size, 'documents');
    
    let leads = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as Lead));

    // Client-side filtering for fields that can't be combined in Firestore query
    if (filters.status && filters.categoryKey) {
      leads = leads.filter(lead => lead.status === filters.status);
    }
    
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      leads = leads.filter(lead => 
        lead.city?.toLowerCase().includes(cityLower)
      );
    }
    
    if (filters.leadType) {
      const typeLower = filters.leadType.toLowerCase();
      leads = leads.filter(lead => 
        lead.leadType?.toLowerCase().includes(typeLower)
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      leads = leads.filter(lead => 
        lead.businessName?.toLowerCase().includes(searchLower)
      );
    }

    console.log('[LEADS] Returning', leads.length, 'leads after filtering');
    return leads;
  } catch (error: any) {
    console.error('[LEADS] Error listing leads:', error?.code, error?.message);
    return [];
  }
}

/**
 * Get a single lead by ID
 */
export async function getLead(leadId: string): Promise<Lead | null> {
  const db = getDbSafe();
  if (!db) return null;

  try {
    const leadRef = doc(db, 'leads', leadId);
    const snapshot = await getDoc(leadRef);
    
    if (!snapshot.exists()) return null;
    
    return {
      id: snapshot.id,
      ...snapshot.data()
    } as Lead;
  } catch (error: any) {
    console.error('[LEADS] Error getting lead:', error);
    return null;
  }
}

/**
 * Create a new lead
 */
export async function createLead(
  lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'importedAt'>,
  performedBy: string
): Promise<Lead> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const now = Date.now();
    const leadData = {
      ...lead,
      status: lead.status || 'new',
      source: lead.source || 'manual',
      importedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const sanitized = sanitizeFirestoreData(leadData);
    const leadsCol = collection(db, 'leads');
    const docRef = await addDoc(leadsCol, sanitized);

    console.log('[LEADS] ✅ Lead created:', docRef.id);

    // Log activity
    await addLeadActivity(docRef.id, {
      type: 'imported',
      description: `Lead "${lead.businessName}" added via ${lead.source || 'manual'}`,
      performedBy,
    });
    
    return {
      id: docRef.id,
      ...leadData,
    } as Lead;
  } catch (error: any) {
    console.error('[LEADS] Error creating lead:', error);
    throw error;
  }
}

/**
 * Update an existing lead
 */
export async function updateLead(
  leadId: string,
  patch: Partial<Omit<Lead, 'id' | 'createdAt'>>,
  performedBy: string,
  logActivity: boolean = true
): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    // Get current lead for activity logging
    const currentLead = await getLead(leadId);
    
    const leadRef = doc(db, 'leads', leadId);
    const updateData = {
      ...patch,
      updatedAt: Date.now(),
    };

    const sanitized = sanitizeFirestoreData(updateData);
    await updateDoc(leadRef, sanitized);

    console.log('[LEADS] ✅ Lead updated:', leadId);

    // Log activity if status changed
    if (logActivity && currentLead && patch.status && patch.status !== currentLead.status) {
      await addLeadActivity(leadId, {
        type: 'status_change',
        description: `Status changed from "${currentLead.status}" to "${patch.status}"`,
        performedBy,
      });
    } else if (logActivity && patch.notes !== undefined) {
      // Don't log note_added here - that's done separately via addLeadNote
    } else if (logActivity) {
      await addLeadActivity(leadId, {
        type: 'edited',
        description: 'Lead details updated',
        performedBy,
      });
    }
  } catch (error: any) {
    console.error('[LEADS] Error updating lead:', error);
    throw error;
  }
}

/**
 * Bulk update status for multiple leads
 */
export async function bulkUpdateLeadStatus(
  leadIds: string[],
  status: LeadStatus,
  performedBy: string
): Promise<{ success: number; failed: number }> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  let success = 0;
  let failed = 0;

  try {
    const batch = writeBatch(db);
    const now = Date.now();

    for (const leadId of leadIds) {
      const leadRef = doc(db, 'leads', leadId);
      batch.update(leadRef, { 
        status, 
        updatedAt: now 
      });
    }

    await batch.commit();
    success = leadIds.length;

    // Log activities for each lead
    for (const leadId of leadIds) {
      try {
        await addLeadActivity(leadId, {
          type: 'status_change',
          description: `Bulk status update to "${status}"`,
          performedBy,
        });
      } catch (e) {
        console.warn('[LEADS] Failed to log activity for lead:', leadId);
      }
    }

    console.log('[LEADS] ✅ Bulk status update completed:', { success, failed });
  } catch (error: any) {
    console.error('[LEADS] Error in bulk update:', error);
    failed = leadIds.length;
  }

  return { success, failed };
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const leadRef = doc(db, 'leads', leadId);
    await deleteDoc(leadRef);
    console.log('[LEADS] ✅ Lead deleted:', leadId);
  } catch (error: any) {
    console.error('[LEADS] Error deleting lead:', error);
    throw error;
  }
}

// ============================================
// Lead Activities
// ============================================

/**
 * Add an activity log entry for a lead
 */
export async function addLeadActivity(
  leadId: string,
  activity: Omit<LeadActivity, 'id' | 'leadId' | 'timestamp'>
): Promise<LeadActivity> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const activityData = {
      leadId,
      ...activity,
      timestamp: Date.now(),
    };

    const sanitized = sanitizeFirestoreData(activityData);
    const activitiesCol = collection(db, 'lead_activities');
    const docRef = await addDoc(activitiesCol, sanitized);

    return {
      id: docRef.id,
      ...activityData,
    } as LeadActivity;
  } catch (error: any) {
    console.error('[LEADS] Error adding activity:', error);
    throw error;
  }
}

/**
 * Get all activities for a lead
 */
export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }

  try {
    const activitiesCol = collection(db, 'lead_activities');
    const q = query(
      activitiesCol, 
      where('leadId', '==', leadId), 
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as LeadActivity));
  } catch (error: any) {
    console.error('[LEADS] Error getting activities:', error);
    return [];
  }
}

/**
 * Add a note to a lead (convenience function)
 */
export async function addLeadNote(
  leadId: string,
  note: string,
  performedBy: string
): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    // Get current notes
    const lead = await getLead(leadId);
    const existingNotes = lead?.notes || '';
    const timestamp = new Date().toLocaleString();
    const newNotes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;

    // Update lead with new notes
    const leadRef = doc(db, 'leads', leadId);
    await updateDoc(leadRef, {
      notes: newNotes,
      updatedAt: Date.now(),
    });

    // Log activity
    await addLeadActivity(leadId, {
      type: 'note_added',
      description: note.length > 100 ? `${note.substring(0, 100)}...` : note,
      performedBy,
    });

    console.log('[LEADS] ✅ Note added to lead:', leadId);
  } catch (error: any) {
    console.error('[LEADS] Error adding note:', error);
    throw error;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a lead with the same placeId already exists (for Phase 2 deduplication)
 */
export async function checkDuplicatePlaceId(placeId: string): Promise<Lead | null> {
  const db = getDbSafe();
  if (!db || !placeId) return null;

  try {
    const leadsCol = collection(db, 'leads');
    const q = query(leadsCol, where('placeId', '==', placeId), firestoreLimit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as Lead;
  } catch (error: any) {
    console.error('[LEADS] Error checking duplicate:', error);
    return null;
  }
}

/**
 * Get lead counts by status (for dashboard)
 */
export async function getLeadCountsByStatus(): Promise<Record<LeadStatus, number>> {
  const db = getDbSafe();
  const defaultCounts: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    replied: 0,
    qualified: 0,
    booked: 0,
    created: 0,
    published: 0,
    not_interested: 0,
    closed: 0,
  };

  if (!db) return defaultCounts;

  try {
    const leadsCol = collection(db, 'leads');
    const snapshot = await getDocs(leadsCol);
    
    const counts = { ...defaultCounts };
    snapshot.docs.forEach(docSnap => {
      const status = docSnap.data().status as LeadStatus;
      if (status && counts[status] !== undefined) {
        counts[status]++;
      }
    });
    
    return counts;
  } catch (error: any) {
    console.error('[LEADS] Error getting lead counts:', error);
    return defaultCounts;
  }
}

// ============================================
// Phase 2: Batch Operations + Scan Cache
// ============================================

/**
 * Check if a lead exists by placeId (returns boolean for quick check)
 */
export async function leadExistsByPlaceId(placeId: string): Promise<boolean> {
  const existing = await checkDuplicatePlaceId(placeId);
  return existing !== null;
}

/**
 * Bulk create leads (for import operations)
 * Uses batched writes for efficiency
 */
export async function createLeadsBatch(
  leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'importedAt'>>,
  performedBy: string
): Promise<{ created: number; failed: number; ids: string[] }> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const results = { created: 0, failed: 0, ids: [] as string[] };
  const now = Date.now();

  // Firestore batch limit is 500, so we chunk the leads
  const BATCH_SIZE = 400; // Leave room for activity docs
  const chunks: typeof leads[] = [];
  
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    chunks.push(leads.slice(i, i + BATCH_SIZE));
  }

  for (const chunk of chunks) {
    try {
      const batch = writeBatch(db);
      const leadsCol = collection(db, 'leads');
      const activitiesCol = collection(db, 'lead_activities');
      const createdIds: string[] = [];

      for (const lead of chunk) {
        const leadData = {
          ...lead,
          status: lead.status || 'new',
          source: lead.source || 'places_api',
          importedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        const sanitized = sanitizeFirestoreData(leadData);
        const leadRef = doc(leadsCol);
        batch.set(leadRef, sanitized);
        createdIds.push(leadRef.id);

        // Add activity log
        const activityData = {
          leadId: leadRef.id,
          type: 'imported',
          description: `Lead "${lead.businessName}" imported via places_api`,
          performedBy,
          timestamp: now,
        };
        const activityRef = doc(activitiesCol);
        batch.set(activityRef, sanitizeFirestoreData(activityData));
      }

      await batch.commit();
      results.created += chunk.length;
      results.ids.push(...createdIds);
      console.log(`[LEADS] ✅ Batch created ${chunk.length} leads`);
    } catch (error: any) {
      console.error('[LEADS] Error in batch create:', error);
      results.failed += chunk.length;
    }
  }

  return results;
}

// ============================================
// Scan Cache CRUD (for avoiding repeat scans)
// ============================================

const SCAN_CACHE_COLLECTION = 'lead_scan_cache';
const SCAN_CACHE_TTL_DAYS = 30;

/**
 * Get scan cache entry by key (placeId or websiteHost)
 */
export async function getScanCache(key: string): Promise<LeadScanCache | null> {
  const db = getDbSafe();
  if (!db || !key) return null;

  try {
    const cacheRef = doc(db, SCAN_CACHE_COLLECTION, key);
    const snapshot = await getDoc(cacheRef);
    
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as LeadScanCache;
    
    // Check if cache is expired (30 days)
    const ageMs = Date.now() - data.lastScannedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays > SCAN_CACHE_TTL_DAYS) {
      console.log(`[LEADS] Scan cache expired for ${key} (${ageDays.toFixed(1)} days old)`);
      return null; // Treat as not cached
    }
    
    return { id: snapshot.id, ...data };
  } catch (error: any) {
    console.error('[LEADS] Error getting scan cache:', error);
    return null;
  }
}

/**
 * Set scan cache entry
 */
export async function setScanCache(
  key: string,
  data: {
    placeId?: string;
    websiteHost?: string;
    result: ScanCacheResult;
    email?: string;
    emailSourceUrl?: string;
    emailConfidence?: 'high' | 'medium' | 'low';
  }
): Promise<void> {
  const db = getDbSafe();
  if (!db || !key) return;

  try {
    const cacheRef = doc(db, SCAN_CACHE_COLLECTION, key);
    const cacheData = {
      ...data,
      lastScannedAt: Date.now(),
    };
    
    const sanitized = sanitizeFirestoreData(cacheData);
    await updateDoc(cacheRef, sanitized).catch(() => {
      // Document doesn't exist, create it
      return addDoc(collection(db, SCAN_CACHE_COLLECTION), { id: key, ...sanitized });
    });
    
    console.log(`[LEADS] ✅ Scan cache set for ${key}: ${data.result}`);
  } catch (error: any) {
    console.error('[LEADS] Error setting scan cache:', error);
    // Non-critical, don't throw
  }
}

/**
 * Set scan cache using setDoc (creates or overwrites)
 */
export async function upsertScanCache(
  key: string,
  data: {
    placeId?: string;
    websiteHost?: string;
    result: ScanCacheResult;
    email?: string;
    emailSourceUrl?: string;
    emailConfidence?: 'high' | 'medium' | 'low';
  }
): Promise<void> {
  const db = getDbSafe();
  if (!db || !key) return;

  try {
    const { setDoc } = await import('firebase/firestore');
    const cacheRef = doc(db, SCAN_CACHE_COLLECTION, key);
    const cacheData = {
      ...data,
      lastScannedAt: Date.now(),
    };
    
    const sanitized = sanitizeFirestoreData(cacheData);
    await setDoc(cacheRef, sanitized);
    
    console.log(`[LEADS] ✅ Scan cache upserted for ${key}: ${data.result}`);
  } catch (error: any) {
    console.error('[LEADS] Error upserting scan cache:', error);
  }
}

