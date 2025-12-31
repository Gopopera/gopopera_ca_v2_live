export interface Event {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  date: string;
  time: string;
  tags: string[];
  hostId?: string; // Single field - host data fetched from /users/{hostId} in real-time
  imageUrls?: string[]; // Array of image URLs (first one is the main photo)
  // REMOVED: attendeesCount - computed in real-time from reservations
  // DEPRECATED FIELDS - kept for backward compatibility during migration
  /** @deprecated Use hostId and fetch from /users/{hostId} instead */
  host?: string;
  /** @deprecated Use hostId and fetch from /users/{hostId} instead */
  hostName?: string;
  /** @deprecated Use hostId and fetch from /users/{hostId} instead */
  hostPhotoURL?: string;
  /** @deprecated Use imageUrls[0] instead */
  imageUrl?: string;
  /** @deprecated Computed from reservations in real-time */
  attendeesCount?: number;
  createdAt: string; // ISO date string
  // Map coordinates (optional)
  lat?: number;
  lng?: number;
  // Legacy fields for backward compatibility
  location: string; // Combined city + address
  category: 'Music' | 'Community' | 'Markets' | 'Workshop' | 'Wellness' | 'Shows' | 'Food & Drink' | 'Sports' | 'Social';
  price: string;
  rating: number;
  reviewCount: number;
  attendees?: number; // Alias for attendeesCount
  capacity?: number;
  // New fields for reservation and event type
  isPoperaOwned?: boolean; // True for official Popera events
  isFakeEvent?: boolean; // True for fake demo events (locked reservations/chat) - DEPRECATED: use isDemo
  isDemo?: boolean; // True for demo events (locked reservations/chat)
  demoPurpose?: string; // Optional short explanation shown in UI for demo events
  demoType?: string; // Type of demo event (e.g., "city-launch")
  isOfficialLaunch?: boolean; // True for official Popera launch events (fully functional)
  // Note: hostId is defined above as required field (line 10)
  // Note: hostPhotoURL is defined above as deprecated field (line 19)
  aboutEvent?: string; // "About this event" section
  whatToExpect?: string; // "What to expect" section
  isDraft?: boolean; // True for draft events (not published)
  isPublic?: boolean; // True for public events (visible to all users)
  // New fields for event cards and filtering
  // vibes supports both new localized format and legacy string format
  // New format: EventVibe[] with { key, label: { en, fr }, isCustom? }
  // Legacy format: string[] (treated as fallback labels in both languages)
  vibes?: (import('./src/constants/vibes').EventVibe | string)[];
  sessionFrequency?: string; // "weekly" | "monthly" | "one-time"
  sessionMode?: string; // "in-person" | "remote"
  country?: string; // Country name (e.g., "Canada", "United States")
  // Circles + Sessions model fields
  mainCategory?: string; // "curatedSales" | "connectAndPromote" | "mobilizeAndSupport" | "learnAndGrow"
  durationWeeks?: number; // Duration in weeks for ongoing circles
  weeklyDayOfWeek?: number; // 0-6 for weekly sessions (0 = Sunday)
  monthlyDayOfMonth?: number; // 1-31 for monthly sessions
  startDateTime?: number; // Timestamp for session start (alternative to startDate)
  startDate?: string; // ISO date string for session start
  // Payment fields
  hasFee?: boolean; // Whether event charges a fee
  feeAmount?: number; // Fee amount in cents
  currency?: string; // 'cad' or 'usd'
  
  // AI Features
  aiWarmupEnabled?: boolean; // If true, AI posts one icebreaker at event start (default: false)
  aiWarmupPostedAt?: number; // Timestamp when warmup was posted (for idempotency)
}

export enum ViewState {
  LANDING = 'LANDING',
  FEED = 'FEED',
  DETAIL = 'DETAIL',
  CHAT = 'CHAT',
  HOST_PROFILE = 'HOST_PROFILE',
  ABOUT = 'ABOUT',
  CAREERS = 'CAREERS',
  CONTACT = 'CONTACT',
  TERMS = 'TERMS',
  PRIVACY = 'PRIVACY',
  CANCELLATION = 'CANCELLATION',
  GUIDELINES = 'GUIDELINES',
  REPORT_EVENT = 'REPORT_EVENT',
  HELP = 'HELP',
  DEBUG_ENV = 'DEBUG_ENV',
  DEBUG_SEED_DEMO = 'DEBUG_SEED_DEMO',
  DEBUG_CLEANUP_REVIEWS = 'DEBUG_CLEANUP_REVIEWS',
  DEBUG_RESERVATIONS = 'DEBUG_RESERVATIONS',
  VERIFY_FIREBASE = 'VERIFY_FIREBASE',
  SAFETY = 'SAFETY',
  PRESS = 'PRESS',
  AUTH = 'AUTH',
  CREATE_EVENT = 'CREATE_EVENT',
  EDIT_EVENT = 'EDIT_EVENT',
  PROFILE = 'PROFILE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  MY_POPS = 'MY_POPS',
  FAVORITES = 'FAVORITES',
  MY_CALENDAR = 'MY_CALENDAR',
  
  // Profile Sub-pages
  PROFILE_BASIC = 'PROFILE_BASIC',
  PROFILE_NOTIFICATIONS = 'PROFILE_NOTIFICATIONS',
  PROFILE_PRIVACY = 'PROFILE_PRIVACY',
  PROFILE_STRIPE = 'PROFILE_STRIPE',
  PROFILE_REVIEWS = 'PROFILE_REVIEWS',
  PROFILE_FOLLOWING = 'PROFILE_FOLLOWING',
  PROFILE_FOLLOWERS = 'PROFILE_FOLLOWERS',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  RESERVATION_CONFIRMED = 'RESERVATION_CONFIRMED',
  CONFIRM_RESERVATION = 'CONFIRM_RESERVATION',
  
  // Host Payouts
  PAYOUT_SETUP = 'PAYOUT_SETUP',
  PAYOUTS = 'PAYOUTS',
  
  // Ticket
  TICKET = 'TICKET',
  
  // Guide Pages
  GUIDE_10_SEAT = 'GUIDE_10_SEAT',
  
  // Marketing Hub (Admin)
  MARKETING_HUB = 'MARKETING_HUB',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
}