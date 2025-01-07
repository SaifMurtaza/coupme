import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/server/gmail'
import { extractCouponsFromEmails } from '@/lib/server/emailProcessor'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting email scan...')
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '14')
    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - days)
    const afterString = afterDate.toISOString().split('T')[0]

    // Log environment variables presence
    console.log('Environment check:', {
      GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: !!process.env.GMAIL_CLIENT_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL
    })

    const client = new GmailClient(
      process.env.GMAIL_CLIENT_ID!,
      process.env.GMAIL_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    console.log('Executing search query...')
    const searchQuery = `(category:promotions (subject:(coupon OR promo OR discount OR sale OR % off OR savings) OR (coupon OR promo OR discount OR sale OR % off OR savings)) after:${afterString})`
    const messages = await client.listEmails(searchQuery)
    
    console.log(`Found ${messages.length} messages`)
    const coupons = extractCouponsFromEmails(messages)
    console.log(`Extracted ${coupons.length} coupons`)

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Error scanning emails:', error)
    return NextResponse.json(
      { error: 'Failed to scan emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 