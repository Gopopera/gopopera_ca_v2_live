# I18N Sanity Check Summary (FR Locale)

This document summarizes the key internationalization (i18n) changes and glossary decisions made for the French (FR) locale, specifically targeting Québec/Canada brand positioning.

## 1. Canonical Glossary Decisions

The following terminology has been enforced across the application:

| English | French | Notes |
|---------|--------|-------|
| Circle(s) | cercle(s) | Default term for groups. "groupe" acceptable in casual contexts. |
| Session(s) | session(s) | Used for individual meetings within a circle. |
| Event(s) | cercle(s) or session(s) | **Never "événement"** in product UI. |
| Host | hôte | "Organisateur" only when clearly about organizing (e.g., legal docs). |
| Attendee | participant | — |
| Community | communauté | — |
| Email(s) | courriel(s) | **Never "e-mail"** |
| DMs | messages privés | — |
| Explore | Explorer | — |
| Follow / Following | Suivre / Abonnements | Consistent throughout |
| RSVP | Réserver / Confirmer sa place | Avoided "RSVP" in French UI |
| Check-in | arrivée / enregistrement | Context-dependent |

## 2. Category Labels (Exact Match)

The French category labels precisely match the required taxonomy:

| English | French (Exact) |
|---------|----------------|
| Workshops & Skills | Ateliers & Compétences |
| Food & Drink | Nourriture & Boissons |
| Sports & Recreation | Sports & Loisirs |
| Arts & Culture | Arts & Culture |
| Community & Causes | Communauté & Causes |
| ALL | TOUT |

## 3. Key Changes Made

### Translation Keys Added
- `dateTime.dayAgo` - For "1 day ago" / "Il y a 1 jour"
- `hostReviews.*` - Host reviews modal translations
- `circleReviews.*` - Circle reviews modal translations

### Components Updated
- `HostReviewsModal.tsx` - Now uses translation keys for all UI strings
- `ReviewsModal.tsx` - Now uses translation keys for all UI strings

### Terminology Replacements (in `translations.ts`)
- All instances of "événement" replaced with "cercle" or "session"
- All instances of "email/e-mail" replaced with "courriel"
- "Organisateur" replaced with "hôte" where referring to Popera hosts

## 4. Known Exceptions

| Exception | Location | Reason |
|-----------|----------|--------|
| "organisateurs communautaires" | `translations.ts` (landing.description FR) | Refers to "community organizers" as a role, not Popera hosts |
| "Hôte = Organisateur" | Terms of Service (FR) | Legal clarification for users |

## 5. Where to Adjust Translations Going Forward

### Primary Translation File
All user-facing strings are managed in `translations.ts`:
- English translations: `en` object
- French translations: `fr` object

### Adding New Translations
1. Add the key to both `en` and `fr` objects
2. Follow the nested structure (e.g., `section.subsection.key`)
3. Use consistent terminology from the glossary above

### Category Labels
Located in `utils/categoryMapper.ts`:
- `MAIN_CATEGORY_LABELS` - English labels
- `MAIN_CATEGORY_LABELS_FR` - French labels

### Date/Time Formatting
Use keys from `dateTime.*` section for relative dates:
- `today`, `yesterday`, `dayAgo`, `daysAgo`, `weekAgo`, `weeksAgo`, `monthAgo`, `monthsAgo`
- Use `.replace('{count}', String(count))` for parameterized strings

### Pluralization
French uses the same word for singular and plural in many cases (e.g., "avis"):
- Check if plural form differs before adding separate keys
- Use conditional logic: `count === 1 ? t('key.singular') : t('key.plural')`

## 6. QA Verification Checklist

- [x] FR toggle results in fully French UI
- [x] "Circle/cercle" consistent; no "event/événement" in product UI
- [x] "Email" replaced with "courriel" everywhere
- [x] Category labels match the required FR taxonomy exactly
- [x] Tone is human, clear, Quebec-appropriate
- [x] No layout/design changes made
- [x] No behavior changes introduced

## 7. Files Modified

| File | Changes |
|------|---------|
| `translations.ts` | Added dateTime keys, hostReviews/circleReviews sections |
| `components/events/HostReviewsModal.tsx` | Updated to use translation keys |
| `components/events/ReviewsModal.tsx` | Updated to use translation keys |

---

*Last updated: December 2024*
