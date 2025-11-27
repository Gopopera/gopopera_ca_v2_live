# Vercel 404 NOT_FOUND Error Fix

## Problem
When navigating to routes like `/event/${eventId}` or refreshing the page, Vercel returns a `404: NOT_FOUND` error because it tries to find these files on the server, but they don't exist (they're client-side routes).

## Solution

### 1. Created `vercel.json` Configuration
This file tells Vercel to rewrite all routes to `index.html` for client-side routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 2. Added URL Parsing on Initial Load
The app now:
- Parses the URL on initial load to determine the correct `viewState`
- Finds events from URL parameters (e.g., `/event/abc123`)
- Handles direct navigation and page refreshes correctly

### 3. Improved Browser History Management
- Uses `replaceState` instead of `pushState` to avoid creating problematic history entries
- Handles `popstate` events for browser back/forward buttons
- Safely navigates between views without causing 404s

## Routes Supported

- `/` → Landing page
- `/explore` → Event feed
- `/event/:id` → Event detail page
- `/event/:id/chat` → Group chat
- `/profile` → User profile
- `/my-pops` → My Pop-ups
- `/favorites` → Favorites
- `/create-event` → Create event
- `/about`, `/contact`, `/guidelines`, `/terms`, `/privacy`, `/cancellation` → Static pages

## Testing

After deploying:
1. Navigate directly to `/event/{some-event-id}` - should load correctly
2. Refresh the page on any route - should not show 404
3. Use browser back/forward buttons - should work correctly
4. Share a link to an event - recipient should be able to open it

## Reference
- [Vercel Error Codes Documentation](https://vercel.com/docs/errors#not_found)
- [Vercel Rewrites Documentation](https://vercel.com/docs/configuration/routing/rewrites)

