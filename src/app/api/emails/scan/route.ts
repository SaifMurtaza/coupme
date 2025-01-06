import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/server/gmail'
import { extractCouponsFromEmails } from '@/lib/server/emailProcessor'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '14')
    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - days)
    const afterString = afterDate.toISOString().split('T')[0]

    const client = new GmailClient(
      process.env.GMAIL_CLIENT_ID!,
      process.env.GMAIL_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    const searchQuery = `(category:promotions (subject:(coupon OR promo OR discount OR sale OR % off OR savings) OR (coupon OR promo OR discount OR sale OR % off OR savings)) after:${afterString})`
    const messages = await client.listEmails(searchQuery)
    const coupons = extractCouponsFromEmails(messages)

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Error scanning emails:', error)
    return NextResponse.json(
      { error: 'Failed to scan emails' },
      { status: 500 }
    )
  }
} 