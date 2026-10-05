import { NextResponse } from 'next/server'
import { getGeminiClient, isAiAvailable } from '@/lib/ai/gemini-client'
import { matchZoomAttendees, type ZoomMatchInputStudent } from '@/lib/ai/zoom-match'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawText = typeof body.rawText === 'string' ? body.rawText : ''
    const roster: ZoomMatchInputStudent[] = Array.isArray(body.roster) ? body.roster : []

    const client = getGeminiClient()
    const result = await matchZoomAttendees(rawText, roster, client)

    return NextResponse.json({
      available: isAiAvailable(),
      result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        result: { matched: [], ambiguous: [], unmatched: [] },
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
