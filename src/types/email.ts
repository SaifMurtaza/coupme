export interface EmailScanResult {
  success: boolean
  coupons: CouponData[]
  error?: string
}

export interface CouponData {
  id: string
  store: string
  code: string
  description: string
  discount: string
  expiryDate: string
  emailLink: string
}

export interface EmailConnection {
  connected: boolean
  provider: string
  email: string
  tokens: {
    access_token: string
    refresh_token: string
    scope: string
    token_type: string
    expiry_date: number
  }
} 