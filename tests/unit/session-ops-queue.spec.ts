import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  RollCallQueue,
  type SessionOp,
  applyOpsToEntries,
} from '@/lib/roll-call-queue'

describe('Session Ops & Single-Flight Queue Engine (Ticket 03)', () => {
  describe('applyOpsToEntries Pure Reducer', () => {
    const initialEntries = [
      { student: 'stu-1', attendance: null, recitations: 0 },
      { student: 'stu-2', attendance: 'A', recitations: 1 },
      { student: 'stu-3', attendance: null, recitations: 0 },
    ]

    it('applies set_attendance operation', () => {
      const ops: SessionOp[] = [
        {
          idempotencyKey: 'k-1',
          type: 'set_attendance',
          studentId: 'stu-1',
          attendance: 'P',
        },
      ]

      const updated = applyOpsToEntries(initialEntries as any, ops)
      expect(updated.find((e: any) => e.student === 'stu-1')?.attendance).toBe('P')
      expect(updated.find((e: any) => e.student === 'stu-2')?.attendance).toBe('A')
    })

    it('applies set_attendance with C (With Schedule Conflict)', () => {
      const ops: SessionOp[] = [
        {
          idempotencyKey: 'k-conflict',
          type: 'set_attendance',
          studentId: 'stu-1',
          attendance: 'C',
        },
      ]

      const updated = applyOpsToEntries(initialEntries as any, ops)
      expect(updated.find((e: any) => e.student === 'stu-1')?.attendance).toBe('C')
    })

    it('applies adjust_recitation operation with topic', () => {
      const ops: SessionOp[] = [
        {
          idempotencyKey: 'k-2',
          type: 'adjust_recitation',
          studentId: 'stu-2',
          delta: 2,
          topic: 'Proof by induction',
        },
      ]

      const updated = applyOpsToEntries(initialEntries as any, ops)
      const stu2 = updated.find((e: any) => e.student === 'stu-2')
      expect(stu2?.recitations).toBe(3)
      expect(stu2?.recitationTopics).toContain('Proof by induction')
    })

    it('applies mark_all_present without overwriting existing marks (Rule R1)', () => {
      const ops: SessionOp[] = [
        {
          idempotencyKey: 'k-3',
          type: 'mark_all_present',
        },
      ]

      const updated = applyOpsToEntries(initialEntries as any, ops)
      // stu-1 and stu-3 were null -> become P
      expect(updated.find((e: any) => e.student === 'stu-1')?.attendance).toBe('P')
      expect(updated.find((e: any) => e.student === 'stu-3')?.attendance).toBe('P')
      // stu-2 was A -> stays A
      expect(updated.find((e: any) => e.student === 'stu-2')?.attendance).toBe('A')
    })

    it('deduplicates operations by idempotencyKey', () => {
      const ops: SessionOp[] = [
        {
          idempotencyKey: 'k-dup',
          type: 'adjust_recitation',
          studentId: 'stu-1',
          delta: 1,
        },
        {
          idempotencyKey: 'k-dup', // Duplicate key
          type: 'adjust_recitation',
          studentId: 'stu-1',
          delta: 1,
        },
      ]

      const updated = applyOpsToEntries(initialEntries as any, ops)
      const stu1 = updated.find((e: any) => e.student === 'stu-1')
      expect(stu1?.recitations).toBe(1) // Only applied once
    })
  })

  describe('RollCallQueue Single-Flight Dispatcher', () => {
    let mockStorage: Record<string, string>

    beforeEach(() => {
      mockStorage = {}
      globalThis.localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val
        },
        removeItem: (key: string) => {
          delete mockStorage[key]
        },
        clear: () => {
          mockStorage = {}
        },
        length: 0,
        key: () => null,
      }
    })

    it('persists queued operations to localStorage and flushes in batches', async () => {
      let callCount = 0
      const mockDispatcher = vi.fn().mockImplementation(async (ops: SessionOp[]) => {
        callCount++
        return { success: true, processedKeys: ops.map((o) => o.idempotencyKey) }
      })

      const queue = new RollCallQueue('sess-1', {
        dispatcher: mockDispatcher,
        autoFlush: false,
      })

      // Rapidly enqueue 3 operations
      queue.enqueue({
        idempotencyKey: 'op-1',
        type: 'set_attendance',
        studentId: 'stu-1',
        attendance: 'P',
      })
      queue.enqueue({
        idempotencyKey: 'op-2',
        type: 'set_attendance',
        studentId: 'stu-2',
        attendance: 'A',
      })
      queue.enqueue({
        idempotencyKey: 'op-3',
        type: 'adjust_recitation',
        studentId: 'stu-1',
        delta: 1,
      })

      // Operations should be saved in localStorage buffer immediately
      expect(mockStorage['supersec_queue_sess-1']).toBeDefined()

      await queue.flush()

      // Single flight flushed all 3 in one batch
      expect(mockDispatcher).toHaveBeenCalledTimes(1)
      expect(queue.getPendingCount()).toBe(0)

      // Local storage buffer should be cleared
      expect(mockStorage['supersec_queue_sess-1']).toBe('[]')
    })

    it('pauses and triggers onAuthRequired when dispatcher returns 401', async () => {
      const mockDispatcher = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' })
      let authTriggered = false

      const queue = new RollCallQueue('sess-2', {
        dispatcher: mockDispatcher,
        onAuthRequired: () => {
          authTriggered = true
        },
      })

      queue.enqueue({
        idempotencyKey: 'op-auth',
        type: 'set_attendance',
        studentId: 'stu-1',
        attendance: 'P',
      })

      await queue.flush()

      expect(authTriggered).toBe(true)
      expect(queue.isPaused()).toBe(true)
      // Pending op remains safe in queue
      expect(queue.getPendingCount()).toBe(1)
    })
  })
})
