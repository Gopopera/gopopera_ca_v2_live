// Firestore types aligned with existing frontend Event and User interfaces

/**
 * Localized vibe structure for Firestore
 */
export interface FirestoreEventVibe {
  key: string;
  label: {
    en: string;
    fr: string;
  };
  isCustom?: boolean;
}

export interface FirestoreEvent {
  id: string;
  title: string;
  description: string;
  date: string;         // Keep as string, parse at UI layer
  time: string;
  price: string;
  category: string;
  city: string;
  address: string;
  location: string;     // Combined city + address
  tags: string[];
  hostId: string; // Single field - host data fetched from /users/{hostId} in real-time
  // DEPRECATED FIELDS - kept for backward compatibility during migration
  /** @deprecated Use hostId and fetch from /users/{hostId} instead */
  host?: string;
  /** @deprecated Use hostId and fetch from /users/{hostId} instead */
  hostName?: string;
  /** @deprecated Use hostId and fetch from /users/{hostId} instead */
  hostPhotoURL?: string;
  imageUrl?: string;
  imageUrls?: string[]; // Array of image URLs (first one is the main photo)
  rating?: number;
  reviewCount?: number;
  // DEPRECATED: attendeesCount - prefer computing from reservations collection
  // Use subscribeToReservationCount(eventId) for real-time updates
  attendeesCount?: number; // Kept for seed files backward compatibility
  createdAt: number;   // Timestamp
  updatedAt?: number;  // Timestamp
  // Map coordinates
  lat?: number;
  lng?: number;
  // Event type flags
  isPoperaOwned?: boolean;
  isDemo?: boolean;
  demoPurpose?: string; // Optional short explanation shown in UI for demo events
  demoType?: string; // Type of demo event (e.g., "city-launch")
  managedBy?: string; // Email of account managing this event
  isOfficialLaunch?: boolean;
  status?: string;
  public?: boolean;
  // Additional fields
  aboutEvent?: string;
  whatToExpect?: string;
  capacity?: number;
  subtitle?: string; // Event subtitle
  startDate?: number; // Timestamp for event start
  endDate?: number; // Timestamp for event end
  isPublic?: boolean; // Whether event is publicly visible
  allowChat?: boolean; // Whether chat is enabled
  allowRsvp?: boolean; // Whether RSVP is enabled
  isDraft?: boolean; // True for draft events (not published)
  hostPhoneNumber?: string; // Host's phone number for event contact
  // New fields for event cards and filtering
  // vibes supports both new localized format and legacy string format
  vibes?: (FirestoreEventVibe | string)[];
  sessionFrequency?: string; // "weekly" | "monthly" | "one-time"
  sessionMode?: string; // "in-person" | "remote"
  country?: string; // Country name (e.g., "Canada", "United States")
  // Circles + Sessions model fields
  mainCategory?: string; // "curatedSales" | "connectAndPromote" | "mobilizeAndSupport" | "learnAndGrow"
  durationWeeks?: number; // Duration in weeks for ongoing circles
  weeklyDayOfWeek?: number; // 0-6 for weekly sessions (0 = Sunday)
  monthlyDayOfMonth?: number; // 1-31 for monthly sessions
  startDateTime?: number; // Timestamp for session start (alternative to startDate)
  // Payment fields
  hasFee?: boolean; // Whether event charges a fee
  feeAmount?: number; // Fee amount in cents
  currency?: string; // Default: 'cad' or 'usd'
}

// REFACTORED: Single source of truth for user data
// All profile fields standardized to displayName and photoURL only
export interface FirestoreUser {
  id: string;
  uid: string;
  email: string;
  displayName: string; // Single field for user display name
  fullName?: string; // User's full legal name (for payment/identity verification)
  photoURL?: string; // Single field for profile picture
  coverPhotoURL?: string; // Profile background/cover image
  bio?: string | null;
  phoneVerified?: boolean;
  username?: string | null;
  createdAt: number;
  updatedAt?: number;
  
  // Extended fields (kept for functionality)
  city?: string;
  preferences?: 'attend' | 'host' | 'both';
  favorites?: string[]; // Event IDs
  hostedEvents?: string[]; // Event IDs user has created
  preferredCity?: string;
  phone_number?: string;
  phoneVerifiedForHosting?: boolean;
  hostPhoneNumber?: string | null;
  signupIntent?: 'attend' | 'host' | 'both';
  following?: string[]; // Host IDs user is following
  followers?: string[]; // User IDs following this host
  notification_settings?: {
    email_opt_in?: boolean;
    sms_opt_in?: boolean;
    notification_opt_in?: boolean;
  };
  bannedEvents?: string[]; // Event IDs user is banned from
  isDemoHost?: boolean;
  isOfficialHost?: boolean;
  isVerified?: boolean;
  isPoperaDemoHost?: boolean;
  
  // Stripe Connect fields for host payouts
  stripeAccountId?: string; // Stripe Connect account ID
  stripeOnboardingStatus?: 'pending' | 'incomplete' | 'complete' | 'pending_verification'; // Onboarding status
  stripeOnboardingUrl?: string; // Link to complete onboarding
  stripeAccountEnabled?: boolean; // Whether account can receive payouts
  
  // DEPRECATED FIELDS - kept for backward compatibility during migration
  // These will be removed after migration is complete
  /** @deprecated Use displayName instead */
  name?: string;
  /** @deprecated Use photoURL instead */
  imageUrl?: string;
  /** @deprecated Use phoneVerified instead */
  phone_verified?: boolean;
}

export interface FirestoreReview {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string; // Reviewer's profile photo URL
  rating: number; // 1-5
  comment?: string;
  createdAt: number;
  status?: 'pending' | 'accepted' | 'contested'; // Review moderation status
}

export interface FirestoreReservation {
  id: string;
  eventId: string;
  userId: string;
  reservedAt: number;
  status: "reserved" | "checked_in" | "cancelled";
  attendeeCount?: number; // Number of attendees in this reservation (default: 1)
  supportContribution?: number; // Optional support contribution amount
  paymentMethod?: string; // Payment method used: 'google-pay', 'stripe', or empty for free events
  totalAmount?: number; // Total amount paid (for paid events)
  // Stripe payment fields
  paymentIntentId?: string; // Stripe PaymentIntent ID
  subscriptionId?: string; // Stripe Subscription ID (for recurring events)
  paymentStatus?: 'pending' | 'succeeded' | 'failed' | 'refunded';
  payoutStatus?: 'pending' | 'held' | 'released' | 'paid'; // For one-time events
  payoutReleasedAt?: number; // Timestamp when payout was released
  nextChargeDate?: number; // For subscriptions - when next charge occurs
  optOutRequested?: boolean; // User requested to opt-out of subscription
  optOutProcessed?: boolean; // Whether opt-out was processed
  // Check-in fields (v1)
  checkedInAt?: number; // Timestamp when attendee was checked in
  checkedInBy?: string; // UID of host who checked them in
  // Cancellation fields (v1)
  cancelledAt?: number; // Timestamp when reservation was cancelled
  cancelledByUid?: string; // UID of user who cancelled (can be attendee or host)
}

export interface FirestoreExpulsion {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  hostId: string;
  reason: string;
  description?: string;
  expelledAt: number;
}

// REFACTORED: Messages only store senderId - sender info fetched from /users/{senderId}
export interface FirestoreChatMessage {
  id: string;
  eventId: string;
  senderId: string; // Renamed from userId for clarity - fetch sender info from /users/{senderId}
  text: string;
  createdAt: number;
  type?: 'message' | 'announcement' | 'poll' | 'system';
  isHost?: boolean;
  
  // DEPRECATED FIELDS - kept for backward compatibility during migration
  /** @deprecated Use senderId instead */
  userId?: string;
  /** @deprecated Fetch from /users/{senderId} instead */
  userName?: string;
}

export interface FirestoreHostProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  followerCount: number;
  rating?: number;
  reviewCount?: number;
}

// Notification system types
export interface FirestoreNotification {
  id: string;
  userId: string;
  type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event' | 'new-follower' | 'new-favorite' | 'event-getting-full' | 'event-trending' | 'follow-host-suggestion' | 'subscription-reminder';
  title: string;
  body: string;
  timestamp: number; // serverTimestamp
  eventId?: string;
  hostId?: string;
  read: boolean;
  createdAt?: number;
}

// Announcements & Polls
export interface FirestoreAnnouncement {
  id: string;
  eventId: string;
  type: 'announcement' | 'poll';
  title: string;
  message: string;
  options?: string[]; // For polls
  timestamp: number; // serverTimestamp
  createdBy: string; // hostId
  createdAt?: number;
}

export interface FirestorePollVote {
  userId: string;
  option: string; // Selected option index or text
  timestamp: number;
}

// Payment tracking
export interface FirestorePayment {
  id: string;
  reservationId: string;
  eventId: string;
  userId: string;
  hostId: string;
  amount: number; // Total amount in cents
  platformFee: number; // Platform fee in cents (10% including Stripe fees)
  hostPayout: number; // Amount to host in cents
  currency: string; // 'cad' or 'usd'
  paymentIntentId: string; // Stripe PaymentIntent ID
  subscriptionId?: string; // Stripe Subscription ID (for recurring)
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  payoutStatus: 'pending' | 'held' | 'released' | 'paid';
  createdAt: number;
  eventEndDate?: number; // For one-time events - when to release payout (24h after event)
  payoutReleasedAt?: number; // Timestamp when payout was released
}

// ============================================
// Lead Finder & Outreach CRM Types (Phase 1)
// ============================================

/**
 * Outreach email template for lead outreach campaigns
 */
export interface OutreachTemplate {
  id: string;
  name: string;                    // Internal template name
  categoryKey: string;             // Category this template is for (e.g., 'yoga_studio', 'restaurant')
  subject: string;                 // Email subject line
  preheader?: string;              // Email preheader text
  markdownBody: string;            // Email body in markdown format
  theme: 'dark' | 'light' | 'minimal';
  ctaText?: string;                // Call-to-action button text
  ctaUrl?: string;                 // Call-to-action button URL
  createdByEmail: string;          // Admin who created the template
  createdAt: number;               // Timestamp
  updatedAt: number;               // Timestamp
}

/**
 * Lead status for CRM pipeline
 */
export type LeadStatus = 
  | 'new'              // Just imported/added
  | 'contacted'        // Initial outreach sent
  | 'replied'          // Lead responded
  | 'qualified'        // Lead is a good fit
  | 'booked'           // Demo/call scheduled
  | 'created'          // Circle created but not published
  | 'published'        // Circle is live
  | 'not_interested'   // Lead declined
  | 'closed';          // Deal closed (won or lost)

/**
 * Lead record for outreach CRM
 */
export interface Lead {
  id: string;
  businessName: string;            // Business/organization name
  categoryKey: string;             // Category (e.g., 'yoga_studio', 'restaurant')
  leadType: string;                // Sub-type (e.g., 'hot_yoga', 'vegan_restaurant')
  address?: string;                // Street address
  city: string;                    // City name
  neighborhood?: string;           // Neighborhood/district
  website?: string;                // Business website
  phone?: string;                  // Phone number
  email?: string;                  // Contact email
  contactFormUrl?: string;         // URL to contact form if no email
  igHandle?: string;               // Instagram handle
  status: LeadStatus;              // Pipeline status
  notes?: string;                  // Internal notes
  source: 'manual' | 'places_api' | 'csv_import'; // How the lead was added
  importedAt: number;              // When lead was imported/created
  lastContactedAt?: number;        // Last outreach timestamp
  nextFollowUpAt?: number;         // Scheduled follow-up date
  assignedTo?: string;             // Admin email assigned to this lead
  createdAt: number;               // Timestamp
  updatedAt: number;               // Timestamp
  placeId?: string;                // Google Places ID for deduplication (Phase 2)
  // Phase 2: Additional fields from Places API + email extraction
  rating?: number;                 // Google Places rating (1-5)
  reviewCount?: number;            // Google Places review count
  emailSourceUrl?: string;         // URL where email was found
  emailConfidence?: 'high' | 'medium' | 'low'; // Confidence level of extracted email
}

/**
 * Activity log entry for a lead
 */
export type LeadActivityType = 'imported' | 'status_change' | 'note_added' | 'edited' | 'email_sent';

export interface LeadActivity {
  id: string;
  leadId: string;                  // Reference to lead
  type: LeadActivityType;          // Type of activity
  description: string;             // Human-readable description
  performedBy: string;             // Admin email who performed action
  timestamp: number;               // When activity occurred
}

// ============================================
// Lead Finder Phase 2: Scan Cache
// ============================================

/**
 * Scan cache result type
 */
export type ScanCacheResult = 'email_found' | 'no_email' | 'no_website' | 'blocked';

/**
 * Cache entry for scanned websites/places to avoid repeated rescans
 * Key: placeId or websiteHost
 */
export interface LeadScanCache {
  id: string;                      // placeId or websiteHost as key
  placeId?: string;                // Google Places ID
  websiteHost?: string;            // Website hostname (e.g., 'example.com')
  lastScannedAt: number;           // Timestamp of last scan
  result: ScanCacheResult;         // Scan outcome
  email?: string;                  // Email if found
  emailSourceUrl?: string;         // URL where email was found
  emailConfidence?: 'high' | 'medium' | 'low';
}
