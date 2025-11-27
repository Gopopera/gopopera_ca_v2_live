# Question for AI Assistant (ChatGPT/Claude/Gemini)

## Context
I'm getting React error #310 ("Rendered more hooks than during the previous render") in a React component that uses lazy loading with React.Suspense. The error occurs when clicking on an event to view its details.

## Component Structure
- Component is lazy-loaded: `React.lazy(() => import('./pages/EventDetailPage'))`
- Wrapped in `<React.Suspense fallback={<PageSkeleton />}>`
- Conditionally rendered: `{viewState === ViewState.DETAIL && selectedEvent && <EventDetailPage ... />}`
- Component receives an `event` prop that changes when user clicks different events

## Current Hook Structure
```typescript
export const EventDetailPage: React.FC<EventDetailPageProps> = ({ event, ... }) => {
  // ALL hooks called at top, unconditionally:
  const [showFakeEventModal, setShowFakeEventModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reservationCount, setReservationCount] = useState<number | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [hostProfilePicture, setHostProfilePicture] = useState<string | null>(null);
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  
  // Memoized values
  const isFakeEvent = useMemo(() => event?.isFakeEvent === true, [event?.isFakeEvent]);
  const isDemo = useMemo(() => event?.isDemo === true || isFakeEvent, [event?.isDemo, isFakeEvent]);
  // ... more useMemo hooks
  
  // useEffect hooks
  useEffect(() => { ... }, [dependencies]);
  useEffect(() => { ... }, [dependencies]);
  useEffect(() => { ... }, [dependencies]);
  
  // NO early returns before hooks
  // NO conditional hook calls
  // All hooks always called in same order
}
```

## The Problem
Even though:
1. ✅ All hooks are called unconditionally at the top
2. ✅ No early returns before hooks
3. ✅ All useEffect hooks return cleanup functions (even no-op ones)
4. ✅ Values are memoized to prevent unnecessary re-renders
5. ✅ Optional chaining used for safety

The error still occurs when:
- First loading the landing page (error appears)
- Clicking on an event to view details (error appears again)

## Questions
1. **Can React.lazy() + Suspense cause hooks violations?** If the component unmounts/remounts during lazy loading, could React see different hook counts?

2. **Can conditional rendering in parent cause this?** The parent renders: `{viewState === ViewState.DETAIL && selectedEvent && <EventDetailPage />}`. If `selectedEvent` changes from one event to another, could React reuse the component instance but see different hook structures?

3. **Can prop changes cause hooks violations?** When the `event` prop changes (user clicks different event), React should reuse the component. But if the component structure somehow changes based on event properties, could that cause issues?

4. **What's the best way to debug this?** How can I identify which hook is causing the violation? The stack trace points to `useState` but doesn't say which one.

5. **Should I add a key prop?** Would adding `key={event.id}` to force remounting help, or would that cause other issues?

6. **Are there any patterns I'm missing?** What other common causes of error #310 exist that I might not have considered?

## Error Details
- Error: "Minified React error #310"
- Stack trace points to: `EventDetailPage.js:7:1336` at `useState`
- Error boundary catches it: `[BOOT] Error boundary caught error`
- Component stack: `at Ee (EventDetailPage...)`

Please provide:
1. Most likely root causes given this setup
2. Step-by-step debugging approach
3. Recommended fixes
4. Best practices for lazy-loaded components with hooks

