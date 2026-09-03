/**
 * Content for the About page. The committee edits this file; bracketed values are
 * placeholders that must be filled before launch. Nothing here is fabricated.
 */
export const about = {
  story: [
    'A Bengali cultural association in [Town], started in [year] by [a handful of families] who wanted their children to grow up with the festivals, songs and food they grew up with.',
    'Every year we gather four times: a cultural programme at Bengali New Year, Saraswati Puja, Holi, and a cultural programme at Mahalaya to open the Puja season. In between there is always something to cook too much for.',
    '[Two or three sentences from the committee on where the association is today: how many households, what has changed, what is next.]',
  ],
  values: [
    { title: 'Everyone on stage', text: 'Children, first-timers and grandparents all get a turn. The programme is made by members, not booked in.' },
    { title: 'A family is a unit', text: 'One registration per household. Bring the kids, bring the neighbours, bring a dish.' },
    { title: 'Open door', text: 'You do not have to be Bengali, or a member, to come to an event. Come once and see.' },
    { title: 'Run by volunteers', text: 'The committee is elected each year at the annual general meeting, and every event is put on by people who put their hands up.' },
  ],
  committee: [
    { role: 'President', name: '[Name]' },
    { role: 'Secretary', name: '[Name]' },
    { role: 'Treasurer', name: '[Name]' },
    { role: 'Cultural secretary', name: '[Name]' },
    { role: 'Membership', name: '[Name]' },
  ],
  faq: [
    {
      q: 'Do I need to be a member to come to an event?',
      a: 'No. Our programmes are open to everyone, member or not. Membership gets you a say at the annual general meeting and, when it launches, the member portal.',
    },
    {
      q: 'Do I need to be Bengali?',
      a: 'No. If you enjoy the music, the food and the company, you are welcome.',
    },
    {
      q: 'How do I register for an event?',
      a: 'Open the event from the Events page and register your household. If you would like to volunteer on the day, say so when you register.',
    },
    {
      q: 'Can my child perform?',
      a: 'Yes. Speak to the cultural secretary through the contact form before the programme is finalised, usually [N] weeks before the event.',
    },
    {
      q: 'How do I become a member?',
      a: 'Membership is [fee] a year per household. While we are getting started there is no sign-up form: come to an event or send the committee a message, and we will add you.',
    },
    {
      q: 'Where do events happen?',
      a: 'At [Venue], [Town]. Directions and parking notes are on each event page.',
    },
  ],
} as const
