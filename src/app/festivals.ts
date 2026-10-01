import type { Festival } from '@/domain/festival'

/**
 * The community's year, in Bengali-calendar order from the month of Boishakh.
 *
 * What the site shows until the committee has saved a list of their own, and what it falls
 * back to if the saved one cannot be read. The committee edits these under Content → The pages;
 * this file is only where the list starts from.
 *
 * An id is what an evening is filed under and what the drawn mark beside the name is chosen
 * by, so it stays as it is when a festival is renamed.
 */
export const festivals: Festival[] = [
  {
    id: 'boishakhi',
    name: 'Boishakhi',
    bengaliName: 'বৈশাখী',
    season: 'April or May',
    /*
     * Not Poila Boishakh itself: the community does not hold a programme on the day. This is
     * whatever we put on during the month of Boishakh, which is often Rabindra Jayanti.
     */
    description:
      'Our gathering in the month of Boishakh, often around Rabindra Jayanti. Songs, recitation and a meal to open the Bengali year together.',
  },
  {
    id: 'mahalaya',
    name: 'Mahalaya programme',
    bengaliName: 'মহালয়া',
    season: 'September or October',
    description: 'The dawn that opens the Puja season. Our cultural programme: songs, recitation and the stage.',
  },
  {
    id: 'saraswati-puja',
    name: 'Saraswati Puja',
    bengaliName: 'সরস্বতী পূজা',
    season: 'January or February',
    description: 'Morning pujo for learning, the children’s hatekhori and their first letters, then lunch.',
  },
  {
    id: 'holi',
    name: 'Holi',
    bengaliName: 'দোল',
    season: 'March',
    description: 'Colours, songs and a shared lunch, outdoors when the weather allows it.',
  },
]
