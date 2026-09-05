/**
 * The privacy notice, written for the site as it is today. Bracketed values are for the
 * committee. Update this file when a backend, analytics or payments are added.
 */
export const privacy = {
  /* Change this whenever anything on this page changes: it is the date the notice took effect. */
  updatedOn: '5 September 2026',
  controller: '13Parbon, Leeds.',
  sections: [
    {
      title: 'What we collect',
      body: [
        'When you contact us: your name, email address and message.',
        'When you apply to join: the household name, a contact name, email, phone if you give it, and how many adults and children are in the household.',
        'When you register for an event: who is coming from your household and anything you tell us, such as an offer to volunteer.',
      ],
    },
    {
      title: 'Why we use it',
      body: [
        'To reply to you, to run the events you register for, and to manage membership.',
        'We do not sell or share your details with anyone outside the committee, and we do not use them for advertising.',
      ],
    },
    {
      title: 'Cookies and tracking',
      body: [
        'The site sets no tracking cookies and runs no analytics. Your theme choice is stored in your own browser and never sent to us.',
        'The map on our contact page is served by OpenStreetMap, which does not track visitors. Following the directions link hands the venue address to your own maps app.',
      ],
    },
    {
      title: 'Your name and your photographs',
      body: [
        'We list the committee and our members by name on the About page, and we publish photographs from our events in the gallery.',
        'If you would rather your name was not on this website, tell us through the contact form or by email and we will take it off. The same goes for any photograph you or your child appear in.',
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
