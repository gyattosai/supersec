import { NextResponse } from 'next/server'
import { getGeminiClient, isAiAvailable } from '@/lib/ai/gemini-client'
import { cleanRosterWithAi } from '@/lib/ai/roster-cleaner'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawText = typeof body.rawText === 'string' ? body.rawText : ''

    const client = getGeminiClient()
    const result = await cleanRosterWithAi(rawText, client)

    return NextResponse.json({
      available: isAiAvailable(),
      result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        available: false,
        result: { students: [], duplicateCount: 0, totalProcessed: 0 },
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
