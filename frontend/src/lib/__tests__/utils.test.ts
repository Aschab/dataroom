import { describe, it, expect } from 'vitest'
import { formatFileSize, formatDate, cn } from '../utils'

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(500)).toBe('500 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatFileSize(1500)).toBe('1.46 KB')
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
  })
})

describe('formatDate', () => {
  it('returns "just now" for very recent dates', () => {
    const now = new Date().toISOString()
    expect(formatDate(now)).toBe('just now')
  })

  it('formats UTC timestamps correctly (with Z)', () => {
    // Create a timestamp 2 hours ago in UTC
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const result = formatDate(twoHoursAgo)
    expect(result).toBe('2h ago')
  })

  it('formats minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatDate(fiveMinutesAgo)).toBe('5m ago')
  })

  it('formats days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatDate(threeDaysAgo)).toBe('3d ago')
  })

  it('formats old dates as calendar date', () => {
    const oldDate = new Date('2024-01-15T12:00:00Z').toISOString()
    const result = formatDate(oldDate)
    expect(result).toMatch(/Jan 15, 2024/)
  })
})

describe('cn', () => {
  it('combines multiple class names', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('filters out falsy values', () => {
    expect(cn('foo', false, 'bar', undefined, 'baz')).toBe('foo bar baz')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})
