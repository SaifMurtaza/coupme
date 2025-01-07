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
  // Clean the content first
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const pattern of COUPON_PATTERNS) {
    const match = content.match(pattern)
    if (match) {
      const code = match[1] || match[0]
      // Only accept codes that look legitimate
      if (code.length >= 4 && code.length <= 20 && 
          !/mso|width|height|margin|padding|DOCTYPE|HTML/i.test(code) &&
          !/^[0-9]+$/.test(code)) { // Exclude pure numbers
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
  // Remove HTML tags, CSS, and technical content
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\{[^}]+\}/g, ' ') // Remove CSS
    .replace(/https?:\/\/\S+/g, ' ') // Remove URLs
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, ' ') // Remove emails
    .replace(/\.mso\b[^}]*}/g, ' ') // Remove MSO styles
    .replace(/\b\w+_\w+(_\w+)*\.mso\b/g, ' ') // Remove MSO class names
    .replace(/\b(span|div|td|tr|table|body|center|h[1-6]|ul|li|p)\b/g, ' ') // Remove HTML element names
    .replace(/[^\w\s%$.,!?-]/g, ' ') // Remove special characters except common ones
    .replace(/\s+/g, ' ') // Clean up whitespace
    .trim()

  // Split into sentences and find promotional content
  const sentences = cleanContent.split(/[.!?]/)
  const promotionalSentence = sentences.find(sentence => {
    const lower = sentence.toLowerCase().trim()
    return (
      lower.includes('off') ||
      lower.includes('save') ||
      lower.includes('discount') ||
      lower.includes('deal') ||
      lower.includes('sale')
    ) && !lower.includes('mso') && // Exclude sentences with technical terms
       !lower.includes('width') &&
       !lower.includes('height') &&
       !lower.includes('margin') &&
       !lower.includes('padding')
  })

  if (promotionalSentence) {
    return promotionalSentence.trim() + '.'
  }

  // If no promotional sentence found, return empty string
  return ''
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