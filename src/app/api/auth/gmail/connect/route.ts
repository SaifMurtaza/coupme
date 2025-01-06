import { NextResponse } from 'next/server'
import { GmailClient } from '@/lib/server/gmail'

export async function GET() {
  try {
    const client = new GmailClient(
      process.env.GMAIL_CLIENT_ID!,
      process.env.GMAIL_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    const authUrl = client.getAuthUrl()
    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    )
  }
} 