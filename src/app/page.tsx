'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [coupons, setCoupons] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [daysFilter, setDaysFilter] = useState(14)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success')) {
      setIsConnected(true)
      setShowSuccess(true)
      handleScanEmails()
    }
  }, [])

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/gmail/connect')
      const data = await response.json()
      window.location.href = data.url
    } catch (error) {
      console.error('Error connecting to Gmail:', error)
    }
  }

  const handleScanEmails = async () => {
    setIsLoading(true)
    try {
      // Get tokens from URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const tokensParam = urlParams.get('tokens')
      
      if (!tokensParam) {
        console.error('No tokens found')
        return
      }

      const response = await fetch(`/api/emails/scan?days=${daysFilter}`, {
        headers: {
          'Authorization': `Bearer ${tokensParam}`
        }
      })
      const data = await response.json()
      if (data.error) {
        console.error('Error scanning emails:', data.error)
        return
      }
      setCoupons(data.coupons)
    } catch (error) {
      console.error('Error scanning emails:', error)
    }
    setIsLoading(false)
  }

  const filteredCoupons = coupons.filter((coupon: any) => {
    const searchString = searchTerm.toLowerCase()
    return (
      coupon.store.toLowerCase().includes(searchString) ||
      coupon.description.toLowerCase().includes(searchString) ||
      (coupon.code && coupon.code.toLowerCase().includes(searchString)) ||
      (coupon.discount && coupon.discount.toLowerCase().includes(searchString))
    )
  })

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-primary">Coupme</h1>
        
        {!isConnected ? (
          <div className="text-center">
            <button
              onClick={handleConnect}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Connect Gmail
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-green-100 text-green-800 p-4 rounded-lg text-center"
                >
                  Successfully connected to Gmail!
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-2 border rounded-lg"
              />
              <select
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value))}
                className="p-2 border rounded-lg"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
              </select>
            </div>

            {isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Scanning for coupons...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCoupons.map((coupon: any, index: number) => (
                  <a
                    key={index}
                    href={coupon.emailLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-pink-50 hover:border-pink-200 transition-colors">
                      <h3 className="font-semibold text-lg">{coupon.store}</h3>
                      {coupon.description && (
                        <p className="text-gray-600 mt-2 mb-3">{coupon.description}</p>
                      )}
                      {coupon.code !== 'NO_CODE_NEEDED' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-primary font-mono">Code:</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              navigator.clipboard.writeText(coupon.code)
                            }}
                            className="font-mono bg-pink-50 px-2 py-1 rounded hover:bg-pink-100 transition-colors"
                            title="Click to copy"
                          >
                            {coupon.code}
                          </button>
                        </div>
                      )}
                      {coupon.expiryDate && (
                        <p className="text-sm text-gray-500 mt-2">
                          Expires: {new Date(coupon.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
} 