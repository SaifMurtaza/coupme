import { CouponData } from '@/types/email'

const COUPON_PATTERNS = [
  // Look for exact patterns with word boundaries
  /\bCODE[\s:-]*"?([A-Z0-9]{4,20})"?\b/i,
  /\bCOUPON[\s:-]*"?([A-Z0-9]{4,20})"?\b/i,
  /\bPROMO[\s:-]*"?([A-Z0-9]{4,20})"?\b/i,
  // Look for codes in common HTML patterns
  /<[^>]*>(CODE|COUPON|PROMO):?\s*([A-Z0-9]{4,20})<\/[^>]*>/i,
  // Look for codes in special formatting
  /["']([A-Z0-9]{4,20})["']\s*(?:code|coupon|promo)/i,
]

const DISCOUNT_PATTERNS = [
  // Specific percentage discounts
  /(\d+)%\s*off\s*(all|everything|storewide|sitewide|frames|lenses|contacts?)?/i,
  /save\s*(\d+)%/i,
  /up\s*to\s*(\d+)%\s*off/i,
  // Multiple discounts in one
  /(\d+)%\s*off\s*[^+]*\+\s*(\d+)%\s*off/i,
  // Dollar amounts
  /\$(\d+)\s*off/i,
]

function extractStore(email: any): string {
  try {
    const fromHeader = email.payload.headers.find((h: any) => h.name === 'From')
    if (!fromHeader) return 'Unknown Store'
    
    const storeName = fromHeader.value.split('<')[0].trim()
    return storeName
  } catch (error) {
    console.error('Error extracting store:', error)
    return 'Unknown Store'
  }
}

function extractCode(content: string): string {
  try {
    // Most promotional emails don't have specific codes
    // Only look for very explicit code patterns
    const textContent = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Look for codes that are explicitly marked as promo codes
    const explicitCodeMatch = textContent.match(/promo\s*code:?\s*["']?([A-Z0-9]{5,20})["']?/i) ||
                             textContent.match(/coupon\s*code:?\s*["']?([A-Z0-9]{5,20})["']?/i) ||
                             textContent.match(/use\s*code:?\s*["']?([A-Z0-9]{5,20})["']?/i)

    if (explicitCodeMatch && explicitCodeMatch[1]) {
      const code = explicitCodeMatch[1]
      if (!/^(CODE|PROMO|SAVE|UPTO|EXTRA|FLASH|SALE)$/i.test(code)) {
        return code.toUpperCase()
      }
    }

    return 'NO_CODE_NEEDED'
  } catch (error) {
    console.error('Error extracting code:', error)
    return 'NO_CODE_NEEDED'
  }
}

function extractDiscount(content: string): string {
  try {
    const textContent = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    for (const pattern of DISCOUNT_PATTERNS) {
      const match = textContent.match(pattern)
      if (match) {
        // Handle multiple discounts (e.g., "60% off frames + 40% off lenses")
        if (match[2]) {
          return `${match[1]}% off + ${match[2]}% off`
        }
        // Handle "up to X%" format
        if (pattern.source.includes('up\\s*to')) {
          return `Up to ${match[1]}% off`
        }
        // Handle specific discounts with items
        if (match[2]) {
          return `${match[1]}% off ${match[2]}`
        }
        return match[0]
      }
    }
    return ''
  } catch (error) {
    console.error('Error extracting discount:', error)
    return ''
  }
}

function extractDescription(content: string): string {
  try {
    const textContent = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Look for the main promotional message
    const promoMatch = textContent.match(/(?:flash sale|winter sale|sale)!?\s*([^.!?]+)[.!?]/i) ||
                      textContent.match(/(\d+%\s*off[^.!?]+)[.!?]/i) ||
                      textContent.match(/(save [^.!?]+)[.!?]/i)

    if (promoMatch && promoMatch[1]) {
      let description = promoMatch[1].trim()
      if (!description.endsWith('.')) {
        description += '.'
      }
      return description.charAt(0).toUpperCase() + description.slice(1)
    }

    return ''
  } catch (error) {
    console.error('Error extracting description:', error)
    return ''
  }
}

function decodeBase64(str: string): string {
  try {
    // Handle URL-safe base64 by replacing URL-safe chars
    const normalized = str
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/\s/g, '') // Remove any whitespace

    // Add padding if needed
    const pad = normalized.length % 4
    const padded = pad ? normalized + '='.repeat(4 - pad) : normalized

    return Buffer.from(padded, 'base64').toString('utf-8')
  } catch (error) {
    console.error('Error decoding base64:', error)
    return ''
  }
}

export async function extractCouponsFromEmails(emails: any[]): Promise<CouponData[]> {
  console.log(`Processing ${emails.length} emails for coupons...`)
  const coupons: CouponData[] = []

  for (const email of emails) {
    try {
      console.log(`Processing email ID: ${email.id}`)
      
      const parts = email.payload.parts || [email.payload]
      let content = ''

      for (const part of parts) {
        try {
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            if (part.body && part.body.data) {
              content += decodeBase64(part.body.data)
            }
          }
        } catch (partError) {
          console.error('Error processing email part:', partError)
          continue
        }
      }

      if (!content) {
        console.log('No content found in email')
        continue
      }

      const store = extractStore(email)
      console.log(`Store: ${store}`)
      
      const code = extractCode(content)
      console.log(`Code: ${code}`)
      
      const discount = extractDiscount(content)
      console.log(`Discount: ${discount}`)
      
      const description = extractDescription(content)
      console.log(`Description: ${description}`)

      if ((discount || code !== 'NO_CODE_NEEDED') && description) {
        coupons.push({
          id: email.id,
          store,
          code,
          description,
          discount,
          expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          emailLink: `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`,
        })
        console.log('Added coupon to results')
      } else {
        console.log('Skipped email - no valid coupon or description found')
      }
    } catch (error) {
      console.error('Error processing email:', error)
    }
  }

  console.log(`Found ${coupons.length} valid coupons`)
  return coupons
} 