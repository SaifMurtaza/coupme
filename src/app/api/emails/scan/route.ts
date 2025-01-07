import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/server/gmail'
import { extractCouponsFromEmails } from '@/lib/server/emailProcessor'

export const maxDuration = 300 // Set max duration to 5 minutes
export const dynamic = 'force-dynamic' // Disable caching

export async function GET(request: NextRequest) {
  try {
    console.log('Starting email scan...')
    
    // Get auth token from request header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found')
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    try {
      const tokens = JSON.parse(Buffer.from(authHeader.split(' ')[1], 'base64').toString())
      console.log('Successfully parsed tokens from header')

      const searchParams = request.nextUrl.searchParams
      const days = parseInt(searchParams.get('days') || '14')
      const afterDate = new Date()
      afterDate.setDate(afterDate.getDate() - days)
      const afterString = afterDate.toISOString().split('T')[0]
      console.log(`Scanning emails from ${afterString}`)

      const client = new GmailClient(
        process.env.GMAIL_CLIENT_ID!,
        process.env.GMAIL_CLIENT_SECRET!,
        process.env.NEXTAUTH_URL + '/api/auth/callback/google'
      )

      // Set the credentials from the auth header
      client.setCredentials(tokens)
      console.log('Client credentials set successfully')

      console.log('Executing Gmail search query...')
      const searchQuery = `(category:promotions (subject:(coupon OR promo OR discount OR sale OR % off OR savings) OR (coupon OR promo OR discount OR sale OR % off OR savings)) after:${afterString})`
      
      // Add timeout to listEmails
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gmail API timeout')), 60000)
      )
      const messagesPromise = client.listEmails(searchQuery)
      const messages = await Promise.race([messagesPromise, timeoutPromise]) as any[]
      
      console.log(`Found ${messages.length} matching emails`)
      
      if (messages.length === 0) {
        return NextResponse.json({ coupons: [] })
      }

      console.log('Processing emails for coupons...')
      const coupons = await extractCouponsFromEmails(messages)
      console.log(`Successfully extracted ${coupons.length} coupons`)

      return NextResponse.json({ coupons })
    } catch (parseError) {
      console.error('Error parsing or using tokens:', parseError)
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error'
      return NextResponse.json(
        { error: 'Failed to process request', details: errorMessage },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error scanning emails:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to scan emails', details: errorMessage },
      { status: 500 }
    )
  }
} 