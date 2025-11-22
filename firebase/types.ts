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
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  city?: string;
  bio?: string;
  preferences?: 'attend' | 'host' | 'both';
  favorites?: string[]; // Event IDs
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

