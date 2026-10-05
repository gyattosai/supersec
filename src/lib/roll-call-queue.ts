export type SessionOp =
  | {
      idempotencyKey: string
      type: 'set_attendance'
      studentId: string
      attendance: 'P' | 'A' | 'E' | null
      excuseReason?: string
    }
  | {
      idempotencyKey: string
      type: 'adjust_recitation'
      studentId: string
      delta: number
      topic?: string
    }
  | {
      idempotencyKey: string
      type: 'mark_all_present'
    }

export function applyOpsToEntries(entries: any[], ops: SessionOp[]): any[] {
  const result = entries.map((e) => ({
    ...e,
    recitationTopics: Array.isArray(e.recitationTopics) ? [...e.recitationTopics] : [],
  }))

  const seenKeys = new Set<string>()

  for (const op of ops) {
    if (seenKeys.has(op.idempotencyKey)) {
      continue
    }
    seenKeys.add(op.idempotencyKey)

    if (op.type === 'set_attendance') {
      const idx = result.findIndex((e) => {
        const sid = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        return sid === op.studentId
      })
      if (idx !== -1) {
        result[idx].attendance = op.attendance
        if (op.excuseReason) {
          result[idx].excuseReason = op.excuseReason
        }
      }
    } else if (op.type === 'adjust_recitation') {
      const idx = result.findIndex((e) => {
        const sid = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        return sid === op.studentId
      })
      if (idx !== -1) {
        const nextCount = Math.max(0, (result[idx].recitations || 0) + op.delta)
        result[idx].recitations = nextCount
        if (op.topic && op.topic.trim()) {
          result[idx].recitationTopics.push(op.topic.trim())
        }
      }
    } else if (op.type === 'mark_all_present') {
      for (const entry of result) {
        if (entry.attendance == null) {
          entry.attendance = 'P'
        }
      }
    }
  }

  return result
}

export interface RollCallQueueOptions {
  dispatcher?: (ops: SessionOp[]) => Promise<{ success: boolean; processedKeys: string[] }>
  onAuthRequired?: () => void
  onSync?: (processedKeys: string[]) => void
  autoFlush?: boolean
}

export class RollCallQueue {
  private sessionId: string
  private queue: SessionOp[] = []
  private inFlight = false
  private paused = false
  private autoFlush = true
  private storageKey: string
  private dispatcher?: (ops: SessionOp[]) => Promise<{ success: boolean; processedKeys: string[] }>
  private onAuthRequired?: () => void
  private onSync?: (processedKeys: string[]) => void

  constructor(sessionId: string, options: RollCallQueueOptions = {}) {
    this.sessionId = sessionId
    this.storageKey = `supersec_queue_${sessionId}`
    this.dispatcher = options.dispatcher
    this.onAuthRequired = options.onAuthRequired
    this.onSync = options.onSync
    if (options.autoFlush !== undefined) {
      this.autoFlush = options.autoFlush
    }
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.queue = parsed
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  private saveToStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue))
    } catch {
      // Ignore storage write errors
    }
  }

  public enqueue(op: SessionOp) {
    this.queue.push(op)
    this.saveToStorage()
    // Trigger flush in background if autoFlush is enabled
    if (this.autoFlush && !this.paused && !this.inFlight) {
      void this.flush()
    }
  }

  public async flush(): Promise<void> {
    if (this.inFlight || this.paused || this.queue.length === 0) {
      return
    }

    this.inFlight = true
    const batch = [...this.queue]

    try {
      let result: { success: boolean; processedKeys: string[] }

      if (this.dispatcher) {
        result = await this.dispatcher(batch)
      } else {
        const res = await fetch(`/api/sessions/${this.sessionId}/ops`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops: batch }),
        })

        if (res.status === 401) {
          throw { status: 401, message: 'Unauthorized' }
        }

        if (!res.ok) {
          throw new Error(`Ops request failed with status ${res.status}`)
        }

        result = await res.json()
      }

      // Remove processed keys
      const processedSet = new Set(result.processedKeys || [])
      this.queue = this.queue.filter((op) => !processedSet.has(op.idempotencyKey))
      this.saveToStorage()

      if (this.onSync) {
        this.onSync(result.processedKeys || [])
      }
    } catch (err: any) {
      if (err?.status === 401) {
        this.paused = true
        if (this.onAuthRequired) {
          this.onAuthRequired()
        }
      }
      // If network offline or general error, keep items in queue and try again later
    } finally {
      this.inFlight = false
      // If more items accumulated while flushing and not paused, flush again
      if (this.queue.length > 0 && !this.paused) {
        void this.flush()
      }
    }
  }

  public getPendingCount(): number {
    return this.queue.length
  }

  public isPaused(): boolean {
    return this.paused
  }

  public resume() {
    this.paused = false
    void this.flush()
  }

  public getQueue(): readonly SessionOp[] {
    return this.queue
  }
}
