import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/server/gmail'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url))
    }

    const client = new GmailClient(
      process.env.GMAIL_CLIENT_ID!,
      process.env.GMAIL_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    const tokens = await client.getTokens(code)
    client.setCredentials(tokens)
    const email = await client.getUserEmail()

    // Encode tokens for URL
    const encodedTokens = Buffer.from(JSON.stringify(tokens)).toString('base64')
    const redirectUrl = new URL('/?success=true', request.url)
    redirectUrl.searchParams.set('tokens', encodedTokens)
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error in callback:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
} 