import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const usersCount = await payload.count({
      collection: 'users',
      overrideAccess: true,
    })

    return NextResponse.json({
      hasUsers: usersCount.totalDocs > 0,
    })
  } catch (error) {
    return NextResponse.json(
      { hasUsers: true, error: (error as Error).message },
      { status: 500 },
    )
  }
}
