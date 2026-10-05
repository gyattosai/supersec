import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })

    const count = await payload.count({
      collection: 'users',
      overrideAccess: true,
    })

    if (count.totalDocs > 0) {
      return NextResponse.json(
        { error: 'Setup already completed. A secretary account already exists.' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { name, email, password } = body

    if (!name || !email || !password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Name, valid email, and password (at least 6 characters) are required.' },
        { status: 400 },
      )
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'owner',
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create secretary user.' },
      { status: 500 },
    )
  }
}
