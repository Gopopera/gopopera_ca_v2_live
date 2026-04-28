/**
 * Playbook Image Constants
 * Central source of truth for all image paths used in the 10-Seat Event Playbook guide
 */

export const PLAYBOOK_IMAGES = {
  hero: '/guides/playbook/hero.png',
  seats: '/guides/playbook/seats.png',
  step1: '/guides/playbook/step1-cafe.png',
  step2: '/guides/playbook/step2-offer.png',
  step3: '/guides/playbook/step3-7day.png',
  step4: '/guides/playbook/step4-rsvp.png',
  step5: '/guides/playbook/step5-create.png',
  templates: '/guides/playbook/templates.png',
} as const;

export const PLAYBOOK_IMAGE_ALTS = {
  hero: 'Group gathering of people connecting',
  seats: 'Group of people enjoying a gathering',
  step1: 'Cozy cafe group of 5 people around a table',
  step2: 'Creator hosting an experience',
  step3: '7-day promotion plan calendar and strategy graphic',
  step4: 'RSVP card UI showing reservation options',
  step5: 'Create your next event form interface in Popera',
  templates: 'Copy-paste templates for creators',
} as const;

