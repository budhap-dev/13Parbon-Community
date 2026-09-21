/**
 * The privacy notice, written for the site as it is today. Bracketed values are for the
 * committee. Update this file when a backend or payments are added, and whenever what the
 * site collects changes: the analytics note here has to match what <Analytics /> in App.tsx
 * actually does.
 */
export const privacy = {
  /* Change this whenever anything on this page changes: it is the date the notice took effect. */
  updatedOn: '21 September 2026',
  controller: '13Parbon, Leeds.',
  sections: [
    {
      title: 'What we collect',
      body: [
        'When you contact us: your name, email address and message.',
        'When you apply to join: the household name, a contact name, email, phone if you give it, and how many adults and children are in the household.',
        'When you register for an event: who is coming from your household and anything you tell us, such as an offer to volunteer.',
        'When you leave feedback: what you wrote. If you sign in with Google first and tick the box, we also keep your name as your Google account gives it, so that what you said can be attributed to you. We never keep your email address with it, which means we cannot reply to feedback and cannot tie it to anything else we hold about you. Sent without signing in, it carries nothing about you at all.',
      ],
    },
    {
      title: 'Why we use it',
      body: [
        'To reply to you, to run the events you register for, and to manage membership.',
        'Feedback is read by the committee, and we put some of it on the website — your name and the date, or “Anonymous” if you did not sign it. Nothing goes up until a member of the committee has approved it, and anything you send may simply be read and not published. Ask us and we will take yours down.',
        'We do not sell or share your details with anyone outside the committee, and we do not use them for advertising.',
      ],
    },
    {
      title: 'Cookies and tracking',
      body: [
        'The site sets no cookies of its own. Your theme choice is stored in your own browser and never sent to us.',
        'We count page views using Vercel Web Analytics, run by the company that hosts this site. It records which page was opened, roughly where in the world from, and what kind of device and browser it was, so we can see which pages are read. It uses no cookies, keeps no IP addresses, builds no profile of you, and cannot follow you to any other website. We only ever see totals, never a person.',
        'The map on our contact page is served by OpenStreetMap, which does not track visitors. Following the directions link hands the venue address to your own maps app.',
      ],
    },
    {
      title: 'Your name and your photographs',
      body: [
        'We list the committee and our members by name on the About page, and we publish photographs from our events in the gallery.',
        'If you would rather your name was not on this website, tell us through the contact form or by email and we will take it off. The same goes for any photograph you or your child appear in, and for any feedback of yours we have put up.',
        'You do not have to give a reason, and asking makes no difference to your membership or your welcome at anything we put on.',
      ],
    },
    {
      title: 'Your rights',
      body: [
        'You can ask what we hold about you, ask us to correct it, or ask us to delete it. Write to the committee through the contact form or at the address above.',
      ],
    },
  ],
} as const
