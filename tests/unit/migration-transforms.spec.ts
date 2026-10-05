import { describe, expect, it } from 'vitest'
import {
  utcToManilaDateString,
  mapWeekdayNumberToString,
  mapV1AttendanceStatus,
} from '@/lib/data/migration-transforms'

describe('v1 to v2 Migration Pure Transforms', () => {
  describe('utcToManilaDateString', () => {
    it('correctly maps afternoon UTC to same Manila calendar day', () => {
      // 07:45 UTC is 15:45 (3:45 PM) Manila
      expect(utcToManilaDateString('2026-08-28T07:45:00.000+00:00')).toBe('2026-08-28')
    })

    it('correctly maps late evening UTC to the NEXT Manila calendar day', () => {
      // 23:30 UTC is 07:30 AM next day Manila
      expect(utcToManilaDateString('2026-08-27T23:30:00.000+00:00')).toBe('2026-08-28')
    })

    it('handles midnight UTC boundary cleanly', () => {
      // 00:00 UTC is 08:00 AM Manila on the same day
      expect(utcToManilaDateString('2026-09-01T00:00:00.000Z')).toBe('2026-09-01')
    })
  })

  describe('mapWeekdayNumberToString', () => {
    it('maps 1-6 and 0 to correct weekday codes', () => {
      expect(mapWeekdayNumberToString(1)).toBe('mon')
      expect(mapWeekdayNumberToString(2)).toBe('tue')
      expect(mapWeekdayNumberToString(3)).toBe('wed')
      expect(mapWeekdayNumberToString(4)).toBe('thu')
      expect(mapWeekdayNumberToString(5)).toBe('fri')
      expect(mapWeekdayNumberToString(6)).toBe('sat')
      expect(mapWeekdayNumberToString(0)).toBe('sun')
    })
  })

  describe('mapV1AttendanceStatus', () => {
    it('maps standard v1 statuses to P, A, E, C, and null', () => {
      expect(mapV1AttendanceStatus('PRESENT')).toBe('P')
      expect(mapV1AttendanceStatus('ABSENT')).toBe('A')
      expect(mapV1AttendanceStatus('EXCUSED')).toBe('E')
      expect(mapV1AttendanceStatus('CONFLICT')).toBe('C')
      expect(mapV1AttendanceStatus('NOT_SET')).toBe(null)
      expect(mapV1AttendanceStatus(null)).toBe(null)
    })

    it('maps un-set or conflict records with hasScheduleConflict flag to C', () => {
      expect(mapV1AttendanceStatus('CONFLICT', true)).toBe('C')
      expect(mapV1AttendanceStatus('NOT_SET', true)).toBe('C')
      expect(mapV1AttendanceStatus(null, true)).toBe('C')
      // Explicit present or absent overrides conflict flag
      expect(mapV1AttendanceStatus('PRESENT', true)).toBe('P')
      expect(mapV1AttendanceStatus('ABSENT', true)).toBe('A')
    })
  })
})
