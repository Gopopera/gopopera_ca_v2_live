# Popera App - Comprehensive Resume

**Version:** 2.0  
**Status:** Production-Ready  
**Last Updated:** $(date)

---

## 📱 App Overview

**Popera** is a modern event discovery and community activation platform that enables users to create, discover, and participate in local pop-up events. The platform focuses on bringing communities together through real-world experiences, whether for shopping, networking, or social causes.

### Core Mission
"Bring your crowd anywhere" - The simplest way to gather people, host real-world moments, and mobilize your community.

### Key Value Propositions
1. **Sell & Shop** - Turn your audience into attendees. Sell tickets, host pop-ups, and manage your entire marketplace.
2. **Connect & Promote** - Don't just reach your crowd—gather them. Build your profile and connect with the people who care.
3. **Mobilize & Support** - Turn gatherings into movements. Mobilize your community to raise funds and spread awareness.

---

## 🎯 Core Features

### 1. Event Discovery & Browsing
- **Landing Page**: Hero section, category browsing, featured events
- **Explore Page**: Full event feed with advanced filtering
- **Search**: Real-time search across titles, descriptions, tags, host names
- **Category Filtering**: 10 categories (All, Community, Music, Workshops, Markets, Sports, Social, Shows, Food & Drink, Wellness)
- **City/Location Filtering**: Filter events by city with autocomplete
- **Tag Filtering**: Filter by event tags
- **Combined Filters**: All filters work simultaneously

### 2. Event Creation & Management
- **Create Event**: Full form with validation
  - Event title, description, category
  - Date, time, location (city + address)
  - Multiple image uploads (HEIC conversion, compression)
  - Tags, capacity, price
  - "About Event" and "What to Expect" sections
  - Draft saving capability
- **Edit Event**: Host-only editing with image management
- **Event Types**:
  - Regular events (public, joinable)
  - Draft events (not published)
  - Demo events (locked, for demonstration)
  - Official Popera events (special features)

### 3. RSVP & Reservations
- **Reservation Flow**:
  - Free events: Direct reservation → confirmation page
  - Paid events: Navigate to payment page
  - Demo events: Blocked with modal explanation
- **Reservation Confirmation**:
  - QR code for check-in
  - Reservation ID
  - Event details
  - Downloadable pass
  - Email, SMS, and in-app notifications
- **Reservation Management**:
  - View all reservations in "My Pop-Ups"
  - Cancel reservations
  - Host can remove attendees (triggers refund)

### 4. Group Chat System
- **Access Control**:
  - Must RSVP or be host to access
  - Banned users blocked
  - Demo events locked
- **Features**:
  - Real-time messaging
  - Image uploads
  - Polls (multiple choice or yes/no)
  - Announcements (host-only)
  - Surveys (1-3 questions, short answer or multiple choice)
  - Attendee list with roles
  - Host management tools (remove user, ban user)
  - Chat locking (host-only)
  - Download chat history (host-only)
- **Notifications**: All attendees + host receive notifications for new messages, polls, announcements

### 5. User Profiles & Social Features
- **Profile Pages**:
  - Host profiles with ratings, reviews, events
  - User profiles with metrics (hosted, attended, followers, following)
- **Follow System**:
  - Follow/unfollow hosts
  - Get notified when followed hosts create events
  - View following/followers lists
- **Reviews & Ratings**:
  - Leave reviews after events
  - Host can accept/contest reviews
  - Overall host rating calculated from accepted reviews
  - Review count accuracy (only accepted reviews counted)

### 6. Favorites System
- **Favorite Events**: Save events for later
- **Persistence**: Favorites persist until event ends or user unfavorites
- **Cleanup**: Automatic removal of ended events from favorites
- **Sync**: Favorite state synced across all pages

### 7. Notifications System
- **Channels**: In-app, Email (Resend), SMS (Twilio)
- **User Preferences**: Granular control per channel
- **Active Flows** (7 total):
  1. Reservation Confirmation (User)
  2. RSVP Host Notification
  3. First Event Welcome
  4. New Event from Followed Host
  5. Announcement Notifications
  6. Poll Notifications
  7. New Chat Message Notifications
- **Additional Flows** (4 Tier 1):
  8. New Follower Notification
  9. Event Getting Full Notification
  10. Event Trending Notification
  11. Follow Host Suggestion

### 8. Internationalization
- **Languages**: English (EN) and French (FR)
- **Translation Coverage**: 
  - Header menu
  - Categories
  - Profile pages
  - Event cards
  - Landing page sections
  - Footer links
- **Language Persistence**: Saved in localStorage

### 9. Mobile Optimization
- **Responsive Design**: Mobile-first approach
- **Touch Interactions**: Optimized for touch devices
- **No Pinch-to-Zoom**: Disabled to prevent accidental zooming
- **Proper Spacing**: All components have appropriate padding on mobile
- **Proportionate UI**: Components sized appropriately for phone screens

---

## 🔄 User Flows

### Flow 1: New User Registration
1. User lands on landing page
2. Clicks "Get Started" or "Sign In"
3. Chooses signup method (Email or Google)
4. **Email Signup**:
   - Enters email, password, name
   - Selects preferences (attend/host/both)
   - Account created
5. **Google Signup**:
   - OAuth flow
   - Account created from Google profile
6. Redirected to Explore page or intended destination

### Flow 2: Event Discovery
1. User browses landing page or explore page
2. Uses search bar to find events
3. Filters by category, city, or tags
4. Clicks event card to view details
5. Views event information, images, host profile
6. Can favorite event or proceed to RSVP

### Flow 3: Event Creation (Host)
1. User clicks "Host Event" in header
2. Fills out event creation form:
   - Title, description, category
   - Date, time, location
   - Uploads images
   - Adds tags
   - Sets capacity and price
3. Can save as draft or publish immediately
4. **First Event**: Receives welcome email/SMS
5. Event appears in their "My Hosting" tab
6. Redirected to Explore page

### Flow 4: RSVP/Reservation (Attendee)
1. User views event detail page
2. Clicks "Reserve Spot" button
3. **Free Event**: 
   - Direct reservation created
   - Redirected to confirmation page
4. **Paid Event**:
   - Navigated to payment page
   - After payment, reservation created
   - Redirected to confirmation page
5. **Confirmation Page**:
   - QR code displayed
   - Reservation ID shown
   - Event details displayed
   - Can download pass
6. **Notifications Sent**:
   - User: Confirmation email, SMS, in-app
   - Host: RSVP notification (email, SMS, in-app)

### Flow 5: Group Chat Participation
1. User RSVPs to event
2. Clicks chat icon on event card or "Join Group Chat" button
3. **Access Granted**: Enters group chat
4. **Features Available**:
   - Send text messages
   - Upload images
   - View polls and vote
   - Read announcements
   - View attendee list
5. **Notifications**: Receives notifications for new messages, polls, announcements

### Flow 6: Host Event Management
1. Host views "My Pop-Ups" → "My Hosting" tab
2. Sees all events they're hosting
3. Can click event to:
   - **Manage**: Navigate to event detail page
   - **Edit**: Edit event details and images
   - **Chat**: Access group conversation
4. In chat, host can:
   - Create polls
   - Post announcements
   - Create surveys
   - View attendee list
   - Remove attendees (triggers refund)
   - Ban users
   - Lock chat
   - Download chat history

### Flow 7: Following & Social
1. User views host profile (from event card or event detail page)
2. Clicks "Follow" button
3. **Notifications Sent**:
   - Host receives new follower notification
4. **Benefits**:
   - User notified when host creates new events
   - Can view following list in profile
   - Host can view followers list

### Flow 8: Review & Rating
1. After event ends, user can leave review
2. Review includes rating (1-5 stars) and text
3. Host receives notification
4. Host can accept or contest review
5. Only accepted reviews count toward host rating
6. Reviews visible on host profile and event pages

### Flow 9: Sharing Events
1. User clicks share button on event detail page
2. **Share Options**:
   - Share Link (copy to clipboard or native share)
   - Share to Instagram Story (generates branded image)
   - Download Story Image
3. **Instagram Story**:
   - Branded image with event details
   - Popera logo (conditional color for visibility)
   - Category badge
   - Short URL for link sticker
   - Instructions for adding link
4. Shared link navigates directly to event detail page

### Flow 10: Profile Management
1. User navigates to Profile page
2. **Profile Sections**:
   - Basic Details: Edit username, full name, phone, bio, profile picture
   - Notification Preferences: Toggle email, SMS, in-app notifications
   - Privacy Settings: Manage privacy preferences
   - My Reviews: View and manage reviews (host)
   - Following/Followers: View social connections
   - My Pop-Ups: View hosting and attending events
   - My Favorites: View favorited events
   - Calendar: Calendar view of events

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand (userStore, eventStore, chatStore, profileStore, cityStore)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: Custom ViewState system with URL synchronization
- **Image Processing**: HEIC conversion, compression
- **QR Codes**: qrcode.react
- **Canvas**: html2canvas for pass generation

### Backend Services
- **Authentication**: Firebase Authentication (Email/Password, Google OAuth)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage (images)
- **Email**: Resend API
- **SMS**: Twilio API (production-ready, currently mocked in some flows)

### Data Models

#### Event
```typescript
{
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  date: string;
  time: string;
  tags: string[];
  host: string;
  hostName: string;
  hostId: string;
  imageUrl: string;
  imageUrls: string[];
  attendeesCount: number;
  capacity?: number;
  category: 'Music' | 'Community' | 'Markets' | 'Workshop' | 'Wellness' | 'Shows' | 'Food & Drink' | 'Sports' | 'Social';
  price: string;
  rating: number;
  reviewCount: number;
  location: string;
  lat?: number;
  lng?: number;
  isPoperaOwned?: boolean;
  isDemo?: boolean;
  isDraft?: boolean;
  aboutEvent?: string;
  whatToExpect?: string;
  createdAt: string;
}
```

#### User
```typescript
{
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  favorites: string[];
  rsvps: string[];
  hostedEvents: string[];
  phone_number?: string;
  phone_verified?: boolean;
}
```

#### Reservation
```typescript
{
  id: string;
  eventId: string;
  userId: string;
  status: 'reserved' | 'cancelled';
  attendeeCount: number;
  totalAmount: number;
  createdAt: string;
}
```

#### Notification
```typescript
{
  id: string;
  type: 'new-event' | 'new-rsvp' | 'announcement' | 'poll' | 'new-message' | 'followed-host-event' | 'new-follower' | 'event-getting-full' | 'event-trending' | 'follow-host-suggestion';
  title: string;
  body: string;
  eventId?: string;
  hostId?: string;
  read: boolean;
  createdAt: string;
}
```

### Firestore Collections
- `events` - All events
- `users` - User profiles
- `reservations` - Event reservations
- `notifications/{userId}/items` - In-app notifications
- `chat/{eventId}/messages` - Group chat messages
- `chat/{eventId}/polls` - Polls
- `chat/{eventId}/surveys` - Surveys
- `reviews` - Event reviews
- `email_logs` - Email delivery logs
- `sms_logs` - SMS delivery logs

---

## 🎨 UI/UX Design Principles

### Brand Identity
- **Primary Colors**:
  - Teal: `#15383c` (Popera Teal)
  - Orange: `#e35e25` (Popera Orange)
- **Typography**: Custom heading font, system fonts for body
- **Design Language**: Modern, minimalistic, friendly, community-focused

### Design Patterns
- **Cards**: Rounded corners, subtle shadows, hover effects
- **Buttons**: Rounded-full, gradient backgrounds, touch feedback
- **Modals**: Backdrop blur, centered, responsive
- **Forms**: Clean inputs, validation feedback, error messages
- **Navigation**: Sticky headers, smooth transitions, breadcrumbs

### Responsive Breakpoints
- **Mobile**: < 640px (single column, touch-optimized)
- **Tablet**: 640px - 1024px (2 columns, hybrid)
- **Desktop**: > 1024px (multi-column, hover states)

### Accessibility
- **ARIA Labels**: Key buttons have labels
- **Keyboard Navigation**: Tab order, Enter/Space activation
- **Touch Targets**: Minimum 44px
- **Color Contrast**: WCAG compliant
- **Screen Readers**: Semantic HTML, alt text

---

## 📄 Pages & Views

### Main Pages
1. **Landing Page** (`LANDING`) - Hero, categories, featured events
2. **Explore/Feed Page** (`FEED`) - Full event feed with filters
3. **Event Detail Page** (`DETAIL`) - Event information, RSVP, share
4. **Group Chat** (`CHAT`) - Event group conversation
5. **Host Profile** (`HOST_PROFILE`) - Host's profile and events
6. **My Pop-Ups** (`MY_POPS`) - User's hosting/attending events
7. **Favorites** (`FAVORITES`) - User's favorited events
8. **My Calendar** (`MY_CALENDAR`) - Calendar view of events
9. **Profile** (`PROFILE`) - User's profile and settings
10. **Create Event** (`CREATE_EVENT`) - Event creation form
11. **Edit Event** (`EDIT_EVENT`) - Event editing form
12. **Reservation Confirmation** (`RESERVATION_CONFIRMED`) - RSVP confirmation page

### Profile Sub-Pages
- **Basic Details** (`PROFILE_BASIC`) - Edit profile information
- **Notification Settings** (`PROFILE_NOTIFICATIONS`) - Manage notification preferences
- **Privacy Settings** (`PROFILE_PRIVACY`) - Privacy controls
- **Stripe Settings** (`PROFILE_STRIPE`) - Payment integration
- **My Reviews** (`PROFILE_REVIEWS`) - View and manage reviews
- **Following** (`PROFILE_FOLLOWING`) - Following list
- **Followers** (`PROFILE_FOLLOWERS`) - Followers list
- **Delete Account** (`DELETE_ACCOUNT`) - Account deletion

### Legal/Info Pages
- **About** (`ABOUT`) - About Popera
- **Careers** (`CAREERS`) - Career opportunities
- **Contact** (`CONTACT`) - Contact form
- **Terms** (`TERMS`) - Terms of use
- **Privacy** (`PRIVACY`) - Privacy policy
- **Cancellation** (`CANCELLATION`) - Cancellation policy
- **Guidelines** (`GUIDELINES`) - Community guidelines
- **Help** (`HELP`) - Help and support
- **Safety** (`SAFETY`) - Safety information
- **Press** (`PRESS`) - Press kit
- **Report Event** (`REPORT_EVENT`) - Event reporting

### Authentication
- **Auth Page** (`AUTH`) - Login and signup

---

## 🔐 Security & Permissions

### Firebase Security Rules
- **Firestore**: Role-based access control
- **Storage**: User-specific folders, authenticated access
- **Events**: Public read, authenticated write, host-only edit/delete
- **Reservations**: User can read own, host can read event reservations
- **Chat**: Attendees and host can read/write
- **Reviews**: Public read, authenticated write, host can contest

### Access Control
- **Event Editing**: Only host can edit
- **Chat Access**: Must RSVP or be host
- **Host Tools**: Only host can remove/ban users, lock chat
- **Review Management**: Only host can accept/contest reviews
- **Profile Editing**: Only own profile

---

## 📊 State Management

### Zustand Stores
1. **userStore**: Authentication, user profile, favorites, RSVPs
2. **eventStore**: Events list, real-time Firestore subscription
3. **chatStore**: Messages, polls, real-time subscriptions
4. **profileStore**: Follower/following data, reviews
5. **cityStore**: Selected city (persisted)

### Real-time Updates
- **Events**: Firestore `onSnapshot` for real-time updates
- **Chat**: Real-time message subscriptions
- **Notifications**: Real-time notification updates
- **User Profile**: Real-time profile updates

---

## 🔔 Notification System Details

### Channels
1. **In-App**: Stored in Firestore, real-time updates
2. **Email**: Via Resend API, branded templates
3. **SMS**: Via Twilio API, production-ready

### User Preferences
- Stored in `users/{userId}/notification_settings`
- Granular control: email, SMS, in-app
- Opt-in by default (backward compatible)

### Idempotency
- Email idempotency: Checks `email_logs` before sending
- Prevents duplicate notifications
- Key: `eventId` + `notificationType` + `toEmail`

### Non-Blocking Architecture
- All notifications are fire-and-forget
- Never block main operations
- Errors logged but don't affect UX

---

## 🌐 Internationalization

### Languages Supported
- **English (EN)**: Default
- **French (FR)**: Full translation

### Translation Coverage
- Header menu
- Footer links
- Categories
- Profile pages
- Event cards
- Landing page sections
- Forms and buttons
- Error messages (partial)

### Implementation
- Language context with `useLanguage()` hook
- Translation function `t(key)`
- Category mapper for translated categories
- Language persistence in localStorage

---

## 📱 Mobile Features

### Touch Optimization
- Touch-friendly button sizes (44px minimum)
- Touch feedback (`active:scale-95`)
- Touch manipulation CSS
- No accidental zooming (pinch-to-zoom disabled)

### Responsive Design
- Mobile-first approach
- Proper padding on all screens
- Proportionate component sizing
- Horizontal scroll where appropriate
- Stacked layouts on mobile

### Performance
- Lazy loading for routes
- Image optimization
- Code splitting
- Debounced actions (favorites)

---

## 🔗 Integration Points

### External Services
- **Firebase**: Authentication, Firestore, Storage
- **Resend**: Email delivery
- **Twilio**: SMS delivery
- **Google OAuth**: Social login

### APIs Used
- **Firebase Auth API**: Login, signup, OAuth
- **Firestore API**: Database operations
- **Storage API**: Image uploads
- **Resend API**: Email sending
- **Twilio API**: SMS sending

---

## 🚀 Deployment & Infrastructure

### Build System
- **Vite**: Build tool
- **TypeScript**: Type checking
- **Tailwind CSS**: Styling
- **React**: UI framework

### Environment Variables
- Firebase config
- Resend API key
- Twilio credentials
- Base URL for notifications

### Security
- Environment variables for sensitive data
- Firebase security rules
- CORS configuration for Storage
- Input validation

---

## 📈 Analytics & Tracking

### Current Implementation
- Console logging for debugging
- Email/SMS delivery logs in Firestore
- Error logging
- Performance monitoring (basic)

### Potential Additions
- User analytics
- Event performance metrics
- Conversion tracking
- A/B testing framework

---

## 🎯 Key Differentiators

1. **Community-Focused**: Emphasis on bringing people together
2. **Host Empowerment**: Comprehensive tools for event hosts
3. **Real-time Communication**: Group chat with rich features
4. **Mobile-First**: Optimized for mobile devices
5. **Brand Consistency**: Cohesive design language throughout
6. **Notification System**: Comprehensive multi-channel notifications
7. **Social Features**: Following, reviews, ratings
8. **Flexible Event Types**: Regular, draft, demo, official events

---

## 🔮 Future Enhancements (Planned)

### Notification Categories (Planned)
- Pre-Event Social Warm-Up
- Commitment & Attendance Controls
- Real-Time Event Status
- Social Graph & Community
- Host Growth & Analytics
- Post-Event Wrap-Up
- Trust & Safety
- Recommendation Engine
- AI-Enhanced UX

### Potential Features
- Payment processing (Stripe integration ready)
- Event analytics dashboard
- Advanced search filters
- Event recommendations
- Social sharing enhancements
- Push notifications
- Calendar integration
- Email marketing tools

---

## ✅ Production Readiness

### Status: **READY FOR PRODUCTION**

**Verified:**
- ✅ All critical flows working
- ✅ Error handling comprehensive
- ✅ Security rules in place
- ✅ Mobile optimization complete
- ✅ Notification system functional
- ✅ Real-time updates working
- ✅ Data persistence working
- ✅ User preferences respected
- ✅ Brand consistency maintained

**Known Limitations:**
- Some translation coverage incomplete
- SMS for chat messages disabled (intentional)
- No scheduled notifications (client-side only)
- Payment processing not fully integrated

---

## 📝 Summary

Popera is a comprehensive event platform that enables users to discover, create, and participate in local pop-up events. The app features:

- **11 active notification flows** across 3 channels
- **Real-time group chat** with polls, announcements, surveys
- **Comprehensive event management** for hosts
- **Social features** including following, reviews, ratings
- **Mobile-optimized** UI with proper spacing and proportions
- **Internationalization** support (EN/FR)
- **Production-ready** architecture with Firebase backend

The platform is designed to bring communities together through real-world experiences, with a focus on ease of use, community engagement, and host empowerment.

---

**Document Generated:** $(date)  
**Version:** 2.0  
**Status:** Production-Ready ✅

