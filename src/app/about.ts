import { site } from './site'

/** A paragraph, a run of bullets, or a heading part-way down the story. */
export type StoryBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'heading'; text: string }

/**
 * Content for the About page. The committee edits this file; bracketed values are
 * placeholders that must be filled before launch. Nothing here is fabricated.
 */
export const about = {
  /**
   * Written by the committee, and kept in their voice — the emoji and the jokes are theirs and
   * are the point of it. Blocks rather than a flat list of paragraphs, because the piece has
   * headings and lists in it and flattening those would lose the shape.
   */
  story: [
    {
      kind: 'text',
      text: '13Parbon began in Leeds in 2022 with a handful of Bengali families and a shared dream: that our children would grow up knowing the festivals, songs, stories, and flavours that shaped our own childhoods!',
    },
    {
      kind: 'text',
      text: 'Living far from home, we wanted to create a space where our children could experience Bengali culture firsthand, not just hear stories about it. We wanted them to know the excitement of a new Puja outfit, the joy of Holi colours, the beauty of Rabindrasangeet, and, of course, the importance of always eating “just one more” mishti! 😄',
    },
    {
      kind: 'text',
      text: 'The name 13Parbon celebrates Bengal’s rich tradition of festivals and togetherness. Every year, we gather to celebrate some of the occasions closest to our hearts:',
    },
    {
      kind: 'list',
      items: [
        '🌼 Boishakhi — welcoming the Bengali New Year',
        '📚 Saraswati Puja — seeking blessings for learning and creativity',
        '🎨 Holi — colours, laughter, and colourful faces that sometimes stay colourful for days! 😆',
        '🎭 Mahalaya Cultural Programme — opening the Puja season through music, dance, poetry, and performances',
      ],
    },
    { kind: 'text', text: 'But 13Parbon is about much more than four events a year!' },
    {
      kind: 'text',
      text: 'Between festivals, there’s always a reason to meet. A simple tea gathering somehow turns into a full meal 🍲. A quick discussion becomes a two-hour adda ☕. Someone mentions cooking and suddenly enough food appears to feed an entire neighbourhood! 😂',
    },
    {
      kind: 'text',
      text: 'Together, we have built more than a cultural association. We have built a community. We celebrate achievements, support each other through challenges, share advice (whether requested or not! 😜), and create a space where everyone feels welcome.',
    },
    {
      kind: 'text',
      text: 'What started as a small group of families has grown into a warm and vibrant community bound by friendship, culture, trust, and countless shared memories. We may be miles away from Bengal, but together we’ve created a little piece of home right here in Leeds! ❤️🏡',
    },
    { kind: 'heading', text: 'A Few Things That Make Us… Us! 😄' },
    {
      kind: 'list',
      items: [
        '✨ Every event planning meeting starts with “Let’s keep it simple this year…” and ends with dance performances, decorations, matching outfits, and a feast! 🤣',
        '✨ We can organise a cultural programme faster than we can decide the menu! 🍽️',
        '✨ Our WhatsApp groups are often more active than some stock markets! 📱😆',
        '✨ Someone is always reminding everyone to RSVP. Someone else is always forgetting to RSVP. 😜',
        '✨ We help each other whenever needed… and sometimes even when not needed! ❤️',
        '✨ Every child in our community has at least ten unofficial aunts and uncles looking out for them! 🥰',
        '✨ We may disagree on many things, but never on the importance of good food and good company! 🍤🍮',
        '✨ Most importantly, everyone who joins us becomes part of the family! 🤗',
      ],
    },
    {
      kind: 'text',
      text: '13Parbon is not just an organisation. It’s friendship, culture, laughter, food, endless adda, and a home away from home! ❤️🎉',
    },
  ] as const satisfies readonly StoryBlock[],
  values: [
    { icon: 'mic', title: 'Everyone on stage', text: 'Children, first-timers and grandparents all get a turn. The programme is made by members, everyone is invited.' },
    { icon: 'users', title: 'A family is a unit', text: 'One registration per household. The more, the merrier, bring the kids and your neighbours along!' },
    { icon: 'door', title: 'Open door', text: 'You do not have to be Bengali, or a member, to come to an event. Come once and see.' },
    { icon: 'heart', title: 'Run by volunteers', text: 'The committee is elected each year at the AGM, and our events are delivered by community members who volunteer their time and effort.' },
  ],
  /* In the order the committee gave them, which is not a ranking. */
  committee: [
    { role: 'Secretary', name: 'Mr. Dalim Ghosh' },
    { role: 'Asst. Secretary', name: 'Mr. Subhendu Roy' },
    { role: 'Treasurer', name: 'Mr. Dinesh Panda' },
    { role: 'Cultural Secretary', name: 'Mrs. Abhinanda Pandit' },
    { role: 'Marketing and Publicity Secretary', name: 'Mrs. Pinki Ghosh' },
    { role: 'Media Secretary', name: 'Mrs. Kuhu Panda' },
    { role: 'Event Secretary', name: 'Mr. Budhaditya Pandit' },
  ],
  /*
   * The members' roll: names only. Nothing here says where anyone lives, how old they are or
   * how to reach them, and it is the committee's to keep current — take a name out the day
   * its owner asks.
   */
  members: [
    'Mr. Somnath Das',
    'Mrs. Aditi Sengupta',
    'Mr. Amritasya Majumder',
    'Mrs. Amrita Roy',
    'Mr. Arunashish Banerjee',
    'Mrs. Puja Mukherjee',
    'Mr. Aveek Hazra',
    'Mrs. Madhumita Hazra',
    'Mr. Debashish Das',
    'Mrs. Saswati Ghoshal',
    'Mr. Digjoy Adhikary',
    'Mrs. Poulami Chaudhury',
    'Mr. Md Golam Murtuja',
    'Mrs. Swati Mondal',
    'Mr. Mrinal Maity',
    'Mrs. Ipsita Sarkar Maiti',
    'Mr. Jahir Tarafder',
    'Mrs. Munni Shah',
    'Mr. Rajjoy Adhikary',
    'Mrs. Piyali Nag',
    'Mr. Debashis Hatai',
    'Mrs. Rima Hatai',
    'Mr. Subhom Mitra',
    'Mrs. Saptaparna Mitra',
    'Mr. Sourangshu Roy',
    'Mrs. Sayani Ghosh',
    'Mrs. Payel Roy',
    'Mr. Siddhartha Chakraborty',
    'Mrs. Sulagna Chakraborty',
    'Mr. Subhashis Dutta',
    'Mrs. Sohini Dutta',
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
      a: 'Membership runs per household. While we are getting started there is no sign-up form: come to an event or send the committee a message, and we will add you, and tell you what it costs.',
    },
    {
      q: 'Where do events happen?',
      a: `At ${site.venue}, ${site.address}. Directions and parking notes are on each event page.`,
    },
  ],
} as const
