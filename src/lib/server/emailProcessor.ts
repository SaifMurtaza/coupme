import { CouponData } from '@/types/email'

const COUPON_PATTERNS = [
  /\b[A-Z0-9]{4,20}\b/,
  /CODE:?\s*([A-Z0-9]{4,20})/i,
  /COUPON:?\s*([A-Z0-9]{4,20})/i,
  /PROMO:?\s*([A-Z0-9]{4,20})/i,
]

const DISCOUNT_PATTERNS = [
  /(\d+)%\s*off/i,
  /save\s*(\d+)%/i,
  /(\d+)%\s*discount/i,
  /\$(\d+)\s*off/i,
]

function extractStore(email: any): string {
  const fromHeader = email.payload.headers.find((h: any) => h.name === 'From')
  if (!fromHeader) return 'Unknown Store'
  
  const storeName = fromHeader.value.split('<')[0].trim()
  return storeName
}

function extractCode(content: string): string {
  for (const pattern of COUPON_PATTERNS) {
    const match = content.match(pattern)
    if (match) {
      const code = match[1] || match[0]
      if (code.length >= 4 && code.length <= 20) {
        return code
      }
    }
  }
  return 'NO_CODE_NEEDED'
}

function extractDiscount(content: string): string {
  for (const pattern of DISCOUNT_PATTERNS) {
    const match = content.match(pattern)
    if (match) {
      return match[0]
    }
  }
  return ''
}

function extractDescription(content: string): string {
  // Remove HTML tags and clean up whitespace
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Get the first 2-3 sentences that contain offer details
  const sentences = cleanContent.split(/[.!?]/)
  const relevantSentences = sentences
    .filter(sentence => 
      sentence.toLowerCase().includes('off') ||
      sentence.toLowerCase().includes('save') ||
      sentence.toLowerCase().includes('discount') ||
      sentence.toLowerCase().includes('deal')
    )
    .slice(0, 2)
    .join('. ')

  return relevantSentences || cleanContent.slice(0, 150)
}

function decodeBase64(str: string): string {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}

export function extractCouponsFromEmails(emails: any[]): CouponData[] {
  const coupons: CouponData[] = []

  for (const email of emails) {
    try {
      const parts = email.payload.parts || [email.payload]
      let content = ''

      for (const part of parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          content += decodeBase64(part.body.data || '')
        }
      }

      const store = extractStore(email)
      const code = extractCode(content)
      const discount = extractDiscount(content)
      const description = extractDescription(content)

      if (discount || code !== 'NO_CODE_NEEDED') {
        coupons.push({
          id: email.id,
          store,
          code,
          description,
          discount,
          expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          emailLink: `https://mail.google.com/mail/u/0/#inbox/${email.threadId}`,
        })
      }
    } catch (error) {
      console.error('Error processing email:', error)
    }
  }

  return coupons
} 