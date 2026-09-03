/**
 * The privacy notice, written for the site as it is today. Bracketed values are for the
 * committee. Update this file when a backend, analytics or payments are added.
 */
export const privacy = {
  updatedOn: '[Date]',
  controller: '[Association legal name], [Town]. Contact: [hello@example.org].',
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
      ],
    },
    {
      title: 'Photos',
      body: [
        'We publish photos from our events in the gallery. If you or your child appear in a photo you would like taken down, tell us through the contact form and we will remove it.',
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
