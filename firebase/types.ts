// Firestore types aligned with existing frontend Event and User interfaces

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
  // REMOVED: attendeesCount - computed in real-time from reservations collection
  // Use subscribeToReservationCount(eventId) for real-time updates
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
  vibes?: string[]; // Array of vibe tags (e.g., ["Creative", "Social", "Wellness"])
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
  stripeOnboardingStatus?: 'pending' | 'incomplete' | 'complete'; // Onboarding status
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
  rating: number; // 1-5
  comment?: string;
  createdAt: number;
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
