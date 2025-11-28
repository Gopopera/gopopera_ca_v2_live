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
  host: string;
  hostName: string;    // For backward compatibility
  hostId: string;
  hostPhotoURL?: string; // Host profile picture URL for better performance
  imageUrl?: string;
  imageUrls?: string[]; // Array of image URLs (first one is the main photo)
  rating?: number;
  reviewCount?: number;
  attendeesCount: number;
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
}

export interface FirestoreUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  imageUrl?: string;
  displayName?: string;
  photoURL?: string;
  city?: string;
  bio?: string;
  fullName?: string; // Full name (separate from displayName/userName)
  preferences?: 'attend' | 'host' | 'both';
  favorites?: string[]; // Event IDs
  hostedEvents?: string[]; // Event IDs user has created
  preferredCity?: string; // User's preferred city
  phoneVerified?: boolean; // SMS verification status
  phone_number?: string; // Verified phone number
  phoneVerifiedForHosting?: boolean; // Host phone verification flag (one-time verification for event creation)
  hostPhoneNumber?: string | null; // Phone number used for host verification
  signupIntent?: 'attend' | 'host' | 'both'; // First-run signup intent
  // Follow system
  following?: string[]; // Host IDs user is following
  followers?: string[]; // User IDs following this host
  // Notification preferences
  notification_settings?: {
    email_opt_in?: boolean;
    sms_opt_in?: boolean;
    notification_opt_in?: boolean;
  };
  // Ban system
  bannedEvents?: string[]; // Event IDs user is banned from
  // Demo host flag
  isDemoHost?: boolean; // True for Popera demo host profile
  isOfficialHost?: boolean; // Official Popera host flag
  username?: string; // Username for the user
  isVerified?: boolean; // Whether the account is verified
  phone_verified?: boolean; // Multi-factor enrollment flag
  createdAt: number;
  updatedAt?: number | unknown;
  isPoperaDemoHost?: boolean; // Specific flag for Popera demo host
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

export interface FirestoreChatMessage {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  type?: 'message' | 'announcement' | 'poll' | 'system';
  isHost?: boolean;
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
  type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event';
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
