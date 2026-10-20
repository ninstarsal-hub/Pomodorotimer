/*
 * "What's new" notes. Add a release here only for changes worth announcing (not every fix) — newest first.
 * The id is the release date (YYYY-MM-DD); people see the card once for anything newer than what they last saw.
 */

export interface Release {
  id: string;
  title: string;
  items: { title: string; body: string }[];
}

export const RELEASES: Release[] = [
  {
    id: '2026-10-21',
    title: 'Badges',
    items: [
      { title: 'Pick a badge', body: 'Choose a Stillpoint badge to show next to your name in study circles.' },
      { title: 'Earn rare ones', body: '18 badges unlock as you study — 7-day streaks, 100 hours, night-owl blocks and more. Find them in Progress.' },
    ],
  },
  {
    id: '2026-10-20',
    title: 'Wrap-ups, undo & a Today card',
    items: [
      { title: 'Today card', body: 'Under the timer: what’s due today and how much of it you’ve done.' },
      { title: 'Undo', body: 'Deleted something by accident? Tap Undo, or press Ctrl/Cmd+Z.' },
      { title: 'Exam wrap-up', body: 'The day after an exam, log how it went and send the shaky parts back into your reviews.' },
      { title: 'Circle wrap-up', body: 'Early each week, your circle’s board shows who was most consistent last week.' },
    ],
  },
  {
    id: '2026-10-19',
    title: 'Study together & a mini timer',
    items: [
      { title: 'Study together', body: 'Start a focus block in your circle — friends join, and everyone’s timer ends at the same moment.' },
      { title: 'Mini timer', body: 'A small timer that floats on top of other apps (Chrome and Edge on laptops).' },
      { title: 'Flow timer', body: 'A new 70 / 15 preset between Deep and Ultradian.' },
    ],
  },
  {
    id: '2026-10-17',
    title: 'Study circles',
    items: [
      { title: 'Study circles', body: 'Make a private circle with friends and see each other’s study week on one board.' },
      { title: 'Cheers', body: 'Send a friend a 👏 once a day.' },
    ],
  },
];

export const LATEST_RELEASE = RELEASES[0].id;
