import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
    .substring(0, 100)
}

export function generateId(): string {
  return uuidv4()
}

export function generateRegistrationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `REG-${timestamp}-${random}`
}

export function generateTicketCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TKT-${timestamp}-${random}`
}

export function formatCurrency(amount: number, currency = 'INR', symbol = '₹'): string {
  if (currency === 'INR') {
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  return `${symbol}${amount.toFixed(2)}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  try {
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  } catch {
    return timeStr
  }
}

export function isRegistrationOpen(event: any): boolean {
  const now = new Date()
  if (event.registration_start && new Date(event.registration_start) > now) return false
  if (event.registration_end && new Date(event.registration_end) < now) return false
  return true
}

export function getEventStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    published: { label: 'Published', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
    postponed: { label: 'Postponed', color: 'bg-yellow-100 text-yellow-700' },
  }
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
}

export function getPaymentStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
    verified: { label: 'Verified', color: 'bg-blue-100 text-blue-700' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
    refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-700' },
    free: { label: 'Free', color: 'bg-teal-100 text-teal-700' },
  }
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
}

export function getRegistrationStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
    waitlisted: { label: 'Waitlisted', color: 'bg-orange-100 text-orange-700' },
  }
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
}

export function safeJsonParse(str: string | null, fallback: any = {}) {
  if (!str) return fallback
  try { return JSON.parse(str) }
  catch { return fallback }
}

export function buildShareLinks(url: string, eventName: string) {
  const encoded = encodeURIComponent(url)
  const text = encodeURIComponent(`Check out this event: ${eventName}`)
  return {
    whatsapp: `https://wa.me/?text=${text}%20${encoded}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    twitter: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    telegram: `https://t.me/share/url?url=${encoded}&text=${text}`,
    email: `mailto:?subject=${encodeURIComponent(eventName)}&body=${text}%20${encoded}`,
  }
}
