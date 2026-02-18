import { describe, it, expect } from 'vitest'

describe('unit env', () => {
  it('runs in node', () => {
    expect(typeof window).toBe('undefined')
  })
})
