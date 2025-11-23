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
  imageUrl?: string;
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
  isOfficialLaunch?: boolean;
  // Additional fields
  aboutEvent?: string;
  whatToExpect?: string;
  capacity?: number;
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
  preferences?: 'attend' | 'host' | 'both';
  favorites?: string[]; // Event IDs
  hostedEvents?: string[]; // Event IDs user has created
  preferredCity?: string; // User's preferred city
  phoneVerified?: boolean; // SMS verification status
  phone_number?: string; // Verified phone number
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
  createdAt: number;
  updatedAt?: number;
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
