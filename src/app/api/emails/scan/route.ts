import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/server/gmail'
import { extractCouponsFromEmails } from '@/lib/server/emailProcessor'

// Switch to Node.js runtime
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    console.log('Starting email scan...')
    
    // Get auth token from request header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found')
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let tokens
    try {
      tokens = JSON.parse(Buffer.from(authHeader.split(' ')[1], 'base64').toString())
      console.log('Successfully parsed tokens')
    } catch (tokenError) {
      console.error('Error parsing tokens:', tokenError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authorization token'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '14')
    const maxEmails = 40
    
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

    // Verify we can access the Gmail account
    try {
      const userEmail = await client.getUserEmail()
      console.log(`Successfully connected to Gmail account: ${userEmail}`)
    } catch (emailError) {
      console.error('Error verifying Gmail access:', emailError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to access Gmail account. Please try connecting again.'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('Executing Gmail search query...')
    const searchQuery = `{
      category:promotions 
      (
        (subject:"coupon code" OR subject:"promo code" OR subject:"discount code")
        OR (subject:"% off" OR subject:"save")
      )
      -"order confirmation" -"shipping confirmation" -"delivered" -"receipt" -"invoice"
      after:${afterString}
    }`.replace(/\s+/g, ' ').trim()
    console.log('Search query:', searchQuery)
    
    let messages
    try {
      messages = await client.listEmails(searchQuery)
      console.log(`Found ${messages?.length || 0} matching emails`)

      if (!messages || messages.length === 0) {
        console.log('No matching emails found')
        return new Response(JSON.stringify({
          success: true,
          coupons: [],
          hasMore: false,
          totalFound: 0
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch (searchError) {
      console.error('Error searching emails:', searchError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to search emails. Please try again later.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Process emails in one batch
    const limitedMessages = messages.slice(0, maxEmails)
    if (messages.length > maxEmails) {
      console.log(`Processing first ${maxEmails} emails out of ${messages.length} total`)
    }

    try {
      console.log('Processing emails for coupons...')
      const coupons = await extractCouponsFromEmails(limitedMessages)
      console.log(`Successfully extracted ${coupons.length} coupons`)

      return new Response(JSON.stringify({
        success: true,
        coupons,
        totalFound: messages.length,
        processedEmails: limitedMessages.length,
        remainingEmails: Math.max(0, messages.length - maxEmails)
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (processingError) {
      console.error('Error processing emails:', processingError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Error processing emails. Please try again later.'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 