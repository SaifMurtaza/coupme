import { CouponData } from '@/types/email'

const COUPON_PATTERNS = [
  /CODE:?\s*([A-Z0-9]{4,20})/i,
  /COUPON:?\s*([A-Z0-9]{4,20})/i,
  /PROMO:?\s*([A-Z0-9]{4,20})/i,
  /USE:?\s*([A-Z0-9]{4,20})/i,
  /ENTER:?\s*([A-Z0-9]{4,20})/i,
]

const DISCOUNT_PATTERNS = [
  /(\d+)%\s*off/i,
  /save\s*(\d+)%/i,
  /(\d+)%\s*discount/i,
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
    // Clean the content first
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    for (const pattern of COUPON_PATTERNS) {
      const match = content.match(pattern)
      if (match) {
        const code = match[1] || match[0]
        // Strict validation for coupon codes
        if (code.length >= 4 && code.length <= 20 && 
            !/mso|width|height|margin|padding|DOCTYPE|HTML|style|class|span|font/i.test(code) &&
            !/^[0-9]+$/.test(code) && // Exclude pure numbers
            !/^[A-Z]+$/.test(code) && // Exclude pure letters
            !/[<>{}\[\]()\/\\]/.test(code) && // Exclude special characters
            !/^(USE|CODE|PROMO|COUPON|ENTER)$/i.test(code)) { // Exclude instruction words
          return code
        }
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
    for (const pattern of DISCOUNT_PATTERNS) {
      const match = content.match(pattern)
      if (match) {
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
    // Clean the content first
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\{[^}]+\}/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, ' ')
      .replace(/[^\w\s%$.,!?-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Split into sentences
    const sentences = cleanContent.split(/[.!?]/).filter(s => {
      const trimmed = s.trim()
      return trimmed.length > 0 && trimmed.length < 100 // Only consider shorter sentences
    })

    // Look for the most relevant sentence (prioritize ones with specific discounts)
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase().trim()
      
      // Skip technical or non-promotional content
      if (lower.includes('mso') || 
          lower.includes('width') ||
          lower.includes('unsubscribe')) {
        continue
      }

      // Prioritize sentences with specific discount mentions
      if (lower.match(/\d+%\s*off/) || 
          lower.match(/save\s*\d+%/) ||
          (lower.includes('code') && lower.includes('off'))) {
        
        let cleaned = sentence.trim()
          .replace(/^[^a-zA-Z0-9]+/, '')
          .replace(/\s+/g, ' ')
          .trim()

        if (!cleaned.endsWith('.')) {
          cleaned += '.'
        }

        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      }
    }

    // If no specific discount found, look for any promotional content
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase().trim()
      
      if (lower.includes('off') || lower.includes('save') || lower.includes('discount')) {
        let cleaned = sentence.trim()
          .replace(/^[^a-zA-Z0-9]+/, '')
          .replace(/\s+/g, ' ')
          .trim()

        if (!cleaned.endsWith('.')) {
          cleaned += '.'
        }

        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      }
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