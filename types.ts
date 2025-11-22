export interface Event {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  date: string;
  time: string;
  tags: string[];
  host: string;
  hostName: string; // Keep for backward compatibility
  imageUrl: string;
  attendeesCount: number;
  createdAt: string; // ISO date string
  // Map coordinates (optional)
  lat?: number;
  lng?: number;
  // Legacy fields for backward compatibility
  location: string; // Combined city + address
  category: 'Music' | 'Community' | 'Market' | 'Workshop' | 'Wellness' | 'Shows' | 'Food & Drink' | 'Sports' | 'Social';
  price: string;
  rating: number;
  reviewCount: number;
  attendees?: number; // Alias for attendeesCount
  capacity?: number;
  // New fields for reservation and event type
  isPoperaOwned?: boolean; // True for official Popera events
  isFakeEvent?: boolean; // True for fake demo events (locked reservations/chat) - DEPRECATED: use isDemo
  isDemo?: boolean; // True for demo events (locked reservations/chat)
  isOfficialLaunch?: boolean; // True for official Popera launch events (fully functional)
  hostId?: string; // User ID of the host
  aboutEvent?: string; // "About this event" section
  whatToExpect?: string; // "What to expect" section
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
  AUTH = 'AUTH',
  CREATE_EVENT = 'CREATE_EVENT',
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
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
}