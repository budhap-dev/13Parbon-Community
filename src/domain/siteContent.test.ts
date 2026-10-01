import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import {
  isPhotoAddress,
  linkedSocial,
  paragraphsFromText,
  paragraphsToText,
  readCollage,
  readFestivals,
  readPrivacy,
  readSocial,
  readStory,
  readTools,
  readValues,
  storyFromText,
  storyToText,
  tidyFestivals,
  webAddressOr,
} from './siteContent'

/**
 * What comes out of the settings row before it is allowed onto a page.
 *
 * The row is JSON that anybody on the committee can write to, and some of it ends up in an
 * `href` or an `src`. These are the checks that stand between a saved value and a visitor.
 */
describe('an address is a web address or it is nothing', () => {
  it('keeps http and https', () => {
    expect(webAddressOr('https://www.facebook.com/groups/1')).toBe('https://www.facebook.com/groups/1')
    expect(webAddressOr('  http://example.org  ')).toBe('http://example.org')
  })

  it('refuses a script dressed as a link', () => {
    // The one that matters: pressed, this runs as the site, for whoever pressed it.
    expect(webAddressOr('javascript:alert(document.cookie)')).toBe('')
    expect(webAddressOr('data:text/html,<script>1</script>')).toBe('')
    expect(webAddressOr('facebook.com/13parbon')).toBe('')
    expect(webAddressOr(42)).toBe('')
  })

  it('takes a photograph from this site or over https, and from nowhere else', () => {
    expect(isPhotoAddress('/theme/tram.jpg')).toBe(true)
    expect(isPhotoAddress('https://photos.13parbon.org.uk/full/theme-tram.jpg')).toBe(true)
    // Two slashes is another site's address without its scheme, not a file of ours.
    expect(isPhotoAddress('//elsewhere.example/tram.jpg')).toBe(false)
    expect(isPhotoAddress('javascript:void(0)')).toBe(false)
    expect(isPhotoAddress('http://photos.example/tram.jpg')).toBe(false)
  })
})

describe('the channels', () => {
  it('keeps a channel whose address is bad, without the address', () => {
    const [channel] = readSocial([{ name: 'Facebook', icon: 'facebook', href: 'javascript:alert(1)', blurb: 'News.' }])!
    // Named on the contact page as something to ask about, rather than vanishing.
    expect(channel).toEqual({ name: 'Facebook', icon: 'facebook', href: '', blurb: 'News.' })
    expect(linkedSocial([channel])).toEqual([])
  })

  it('drops a row with no name, and gives an unknown mark the plain link', () => {
    const rows = readSocial([
      { name: '', icon: 'facebook', href: 'https://example.org', blurb: '' },
      { name: 'Mastodon', icon: 'mastodon', href: 'https://example.social/@13parbon', blurb: '' },
      'not a row',
    ])!
    expect(rows).toHaveLength(1)
    expect(rows[0].icon).toBe('link')
  })

  it('tells nothing saved apart from an empty list saved', () => {
    expect(readSocial(undefined)).toBeNull()
    expect(readSocial('facebook')).toBeNull()
    // No channels is an answer the committee can give.
    expect(readSocial([])).toEqual([])
  })
})

describe('the festivals', () => {
  it('keeps an id when a festival is renamed, so its evenings stay filed', () => {
    const [holi] = tidyFestivals([{ id: 'holi', name: 'Dol Jatra' }])
    expect(holi).toEqual({ id: 'holi', name: 'Dol Jatra' })
  })

  it('gives a new festival an id from its name', () => {
    const [added] = tidyFestivals([{ id: '', name: 'Rabindra Jayanti', season: ' May ' }])
    expect(added).toEqual({ id: 'rabindra-jayanti', name: 'Rabindra Jayanti', season: 'May' })
  })

  it('will not have two under one id, or one with no name', () => {
    const rows = readFestivals([
      { id: 'holi', name: 'Holi' },
      { id: 'holi', name: 'Holi again' },
      { id: 'nameless', name: '  ' },
    ])!
    expect(rows.map((f) => f.name)).toEqual(['Holi'])
  })

  it('refuses an id that could not sit in an address', () => {
    const [row] = tidyFestivals([{ id: '../../admin', name: 'Kali Puja' }])
    expect(row.id).toBe('kali-puja')
  })
})

describe('the story as one box of text', () => {
  it('reads paragraphs, a heading and a list', () => {
    expect(storyFromText('We began in 2022.\nA handful of families.\n\n# What we do\n\n- Boishakhi\n- Holi\n\nCome along.')).toEqual([
      { kind: 'text', text: 'We began in 2022. A handful of families.' },
      { kind: 'heading', text: 'What we do' },
      { kind: 'list', items: ['Boishakhi', 'Holi'] },
      { kind: 'text', text: 'Come along.' },
    ])
  })

  it('starts a list at the first bullet even with no empty line before it', () => {
    expect(storyFromText('Every year:\n- Boishakhi\n- Holi')).toEqual([
      { kind: 'text', text: 'Every year:' },
      { kind: 'list', items: ['Boishakhi', 'Holi'] },
    ])
  })

  it('comes back as it went in, so opening the box and closing it changes nothing', () => {
    // If this fails the story section says "unsaved" the moment the screen opens.
    expect(storyFromText(storyToText(defaultSettings.story))).toEqual(defaultSettings.story)
  })

  it('keeps only blocks it can draw', () => {
    expect(
      readStory([
        { kind: 'text', text: 'Kept.' },
        { kind: 'script', text: 'Not a kind of block.' },
        { kind: 'list', items: ['One', '', 7] },
        { kind: 'heading', text: '   ' },
      ]),
    ).toEqual([
      { kind: 'text', text: 'Kept.' },
      { kind: 'list', items: ['One'] },
    ])
  })
})

describe('what we stand for', () => {
  it('drops a half-written card and mends a drawing it does not have', () => {
    expect(
      readValues([
        { icon: 'mic', title: 'Everyone on stage', text: 'All of us.' },
        { icon: 'rocket', title: 'Open door', text: 'Come once.' },
        { icon: 'heart', title: 'No sentence yet', text: '' },
      ]),
    ).toEqual([
      { icon: 'mic', title: 'Everyone on stage', text: 'All of us.' },
      { icon: 'heart', title: 'Open door', text: 'Come once.' },
    ])
  })
})

describe('the theme’s photographs', () => {
  const defaults = defaultSettings.collage

  it('drops a photograph from somewhere it should not be, and mends a bad focus', () => {
    const collage = readCollage(
      {
        label: 'Then and now',
        credit: '',
        photos: [
          { src: 'https://photos.13parbon.org.uk/full/theme-tram.jpg', alt: 'A tram', caption: 'Still running', focus: 'left' },
          { src: 'javascript:alert(1)', alt: '', caption: '', focus: '50% 50%' },
        ],
      },
      defaults,
    )
    expect(collage.photos).toEqual([
      { src: 'https://photos.13parbon.org.uk/full/theme-tram.jpg', alt: 'A tram', caption: 'Still running', focus: '50% 50%' },
    ])
    // An emptied credit is a decision; an emptied label is a collage with no name.
    expect(collage.credit).toBe('')
    expect(readCollage({ label: ' ', photos: [] }, defaults).label).toBe(defaults.label)
  })

  it('falls back whole when what was saved is not a collage', () => {
    expect(readCollage(null, defaults)).toBe(defaults)
    expect(readCollage([], defaults)).toBe(defaults)
  })
})

describe('the privacy notice', () => {
  const defaults = defaultSettings.privacy

  it('reads a saved notice, a paragraph at a time', () => {
    const notice = readPrivacy(
      { updatedOn: '1 October 2026', controller: '13Parbon, Leeds.', basedOn: '21 September 2026', sections: [{ title: 'What we collect', body: ['Your name.', ' ', 'Your email.'] }] },
      defaults,
    )
    expect(notice.sections).toEqual([{ title: 'What we collect', body: ['Your name.', 'Your email.'] }])
    expect(notice.updatedOn).toBe('1 October 2026')
  })

  it('never shows an empty notice, whatever was saved', () => {
    expect(readPrivacy({ sections: [] }, defaults)).toBe(defaults)
    expect(readPrivacy({ sections: [{ title: 'A heading and nothing under it', body: [] }] }, defaults)).toBe(defaults)
  })

  it('types as one paragraph to a line', () => {
    expect(paragraphsFromText('One.\n\nTwo.\nThree.\n')).toEqual(['One.', 'Two.', 'Three.'])
    expect(paragraphsFromText(paragraphsToText(['One.', 'Two.']))).toEqual(['One.', 'Two.'])
  })
})

describe('the committee’s other tools', () => {
  it('keeps only the ones with a name and somewhere to go', () => {
    expect(
      readTools([
        { name: 'Event planning', description: 'Tasks.', href: 'https://13parbon-event-management.vercel.app/' },
        { name: 'Accounts', description: '', href: 'javascript:void(0)' },
        { name: '', description: '', href: 'https://example.org' },
      ]),
    ).toEqual([{ name: 'Event planning', description: 'Tasks.', href: 'https://13parbon-event-management.vercel.app/' }])
  })
})
