import { describe, expect, it } from 'vitest'
import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { getSegmentedButtonClass } from '@/components/ui/segmented-toggle'

describe('Mobile UI Primitives & Linear Tokens (Ticket 01)', () => {
  describe('Button Primitive (>= 44px touch targets)', () => {
    it('applies default size with minimum 44px height for mobile ergonomics', () => {
      const classes = buttonVariants({ size: 'default' })
      expect(classes).toContain('min-h-[44px]')
      expect(classes).toContain('inline-flex')
      expect(classes).toContain('items-center')
      expect(classes).toContain('justify-center')
    })

    it('applies primary variant using Linear brand token', () => {
      const classes = buttonVariants({ variant: 'primary' })
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('text-primary-foreground')
    })

    it('applies destructive variant using danger token', () => {
      const classes = buttonVariants({ variant: 'destructive' })
      expect(classes).toContain('bg-destructive')
      expect(classes).toContain('text-on-brand')
    })

    it('applies icon size with square 44x44px minimum target', () => {
      const classes = buttonVariants({ size: 'icon' })
      expect(classes).toContain('min-h-[44px]')
      expect(classes).toContain('min-w-[44px]')
    })
  })

  describe('Badge Primitive', () => {
    it('applies correct semantic status styles for attendance and flags', () => {
      const successBadge = badgeVariants({ variant: 'success' })
      expect(successBadge).toContain('text-success')

      const warningBadge = badgeVariants({ variant: 'warning' })
      expect(warningBadge).toContain('text-warning')

      const dangerBadge = badgeVariants({ variant: 'danger' })
      expect(dangerBadge).toContain('text-danger')

      const brandBadge = badgeVariants({ variant: 'brand' })
      expect(brandBadge).toContain('text-brand-text')
    })
  })

  describe('SegmentedToggle Presence Styling (P / A / E / –)', () => {
    it('returns green active styles for Present (P) with 44px min hit area', () => {
      const cls = getSegmentedButtonClass('P', 'P')
      expect(cls).toContain('bg-success')
      expect(cls).toContain('min-h-[44px]')
      expect(cls).toContain('min-w-[44px]')
    })

    it('returns red active styles for Absent (A)', () => {
      const cls = getSegmentedButtonClass('A', 'A')
      expect(cls).toContain('bg-danger')
    })

    it('returns amber active styles for Excused (E)', () => {
      const cls = getSegmentedButtonClass('E', 'E')
      expect(cls).toContain('bg-warning')
    })

    it('returns inactive muted styling when option is not selected', () => {
      const cls = getSegmentedButtonClass('P', 'A') // A is selected, checking P
      expect(cls).toContain('text-text-tertiary')
      expect(cls).toContain('min-h-[44px]')
    })
  })
})
