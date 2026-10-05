import { NextResponse } from 'next/server'
import { getGeminiClient, isAiAvailable } from '@/lib/ai/gemini-client'
import { generateChangeNote, type AttendanceDelta } from '@/lib/ai/change-note'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const deltas: AttendanceDelta[] = Array.isArray(body.deltas) ? body.deltas : []

    const client = getGeminiClient()
    const suggestion = await generateChangeNote(deltas, client)

    return NextResponse.json({
      available: isAiAvailable(),
      suggestion,
    })
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        suggestion: 'Updated attendance records.',
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
