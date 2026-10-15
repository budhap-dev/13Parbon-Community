import { describe, expect, it } from 'vitest'
import { pasteAsWhatsApp } from './pasteAsWhatsApp'

describe('pasteAsWhatsApp', () => {
  it('writes bold, italic and strikethrough back as WhatsApp’s marks', () => {
    expect(pasteAsWhatsApp('A <strong>great</strong> <em>night</em>, <s>cold</s> warm')).toBe(
      'A *great* _night_, ~cold~ warm',
    )
  })

  it('keeps spaces outside the marks, where WhatsApp needs them', () => {
    expect(pasteAsWhatsApp('A<b> great </b>night')).toBe('A *great* night')
  })

  it('reads formatting set by style, as Google Docs and Word write it', () => {
    expect(
      pasteAsWhatsApp(
        '<b style="font-weight:normal" id="docs-internal-guid-1"><span style="font-weight:700">Loud</span> and <span style="font-style:italic">soft</span></b>',
      ),
    ).toBe('*Loud* and _soft_')
  })

  it('turns lists, paragraphs and line breaks into lines', () => {
    expect(pasteAsWhatsApp('<p>We loved:</p><ul><li>the food</li><li>the <b>music</b></li></ul><ol start="3"><li>three</li></ol>')).toBe(
      'We loved:\n\n- the food\n- the *music*\n\n3. three',
    )
    expect(pasteAsWhatsApp('<b>one</b><br>two')).toBe('*one*\ntwo')
  })

  it('marks each line on its own, since a mark cannot cross a line break', () => {
    expect(pasteAsWhatsApp('<b>one<br>two</b>')).toBe('*one*\n*two*')
  })

  it('keeps monospace exactly', () => {
    expect(pasteAsWhatsApp('<pre>  *as is*\nline</pre>')).toBe('```\n  *as is*\nline\n```')
  })

  it('leaves a paste with no formatting to the browser', () => {
    expect(pasteAsWhatsApp('')).toBeNull()
    expect(pasteAsWhatsApp('<span>just words</span>')).toBeNull()
    expect(pasteAsWhatsApp('<meta charset="utf-8"><p>a paragraph</p>')).toBeNull()
  })

  it('drops what is not text', () => {
    expect(pasteAsWhatsApp('<style>b{}</style><script>alert(1)</script><b>safe</b>')).toBe('*safe*')
  })
})
