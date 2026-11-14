import { describe, expect, it } from 'vitest'
import { normalizeMacApplicationPath } from './get-applications-for-file.js'

describe('normalizeMacApplicationPath', () => {
  it('keeps an application bundle path unchanged', () => {
    expect(normalizeMacApplicationPath('/Applications/mpv.app')).toBe('/Applications/mpv.app')
  })

  it('recovers the bundle path from a stored executable path', () => {
    expect(normalizeMacApplicationPath('/Applications/mpv.app/Contents/MacOS/.gitkeep')).toBe('/Applications/mpv.app')
    expect(normalizeMacApplicationPath('/Applications/VLC.app/Contents/MacOS/VLC')).toBe('/Applications/VLC.app')
  })

  it('does not change a standalone executable path', () => {
    expect(normalizeMacApplicationPath('/usr/local/bin/mpv')).toBe('/usr/local/bin/mpv')
  })
})
