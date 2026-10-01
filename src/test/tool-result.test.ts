import { describe, expect, it } from 'vitest'
import { getToolResultPreview } from '../server/tool-result'

describe('getToolResultPreview', () => {
  it('returns an empty string when tool result fields are missing', () => {
    expect(getToolResultPreview({})).toBe('')
    expect(
      getToolResultPreview({
        result_preview: undefined,
        result: undefined,
        output: undefined,
        message: undefined,
      }),
    ).toBe('')
  })

  it('normalizes non-string tool results safely', () => {
    expect(getToolResultPreview({ result: { ok: true } })).toBe(
      '{\n  "ok": true\n}',
    )
    expect(getToolResultPreview({ result: 42 })).toBe('42')
    expect(getToolResultPreview({ result: false })).toBe('false')
    expect(getToolResultPreview({ result: ['done'] })).toBe('[\n  "done"\n]')
  })
})
