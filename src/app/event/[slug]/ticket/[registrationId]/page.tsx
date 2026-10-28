'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Printer, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatDate, formatTime } from '../../../utils'

export default function TicketPage() {
  const params = useParams()
  const router = useRouter()
  const regId = params.registrationId as string
  const slug = params.slug as string
  const [ticket, setTicket] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/ticket/${regId}`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json())
    ]).then(([t, s]) => {
      setTicket(t)
      setSettings(s)
      setLoading(false)
    })
  }, [regId])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!ticket || ticket.error) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Ticket not found</p></div>

  const paymentStatusColor = ticket.payment_status === 'verified' || ticket.payment_status === 'free'
    ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  const paymentStatusIcon = ticket.payment_status === 'verified' || ticket.payment_status === 'free'
    ? CheckCircle : AlertCircle

  const PayIcon = paymentStatusIcon

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Print Button - hidden when printing */}
      <div className="max-w-lg mx-auto mb-4 flex gap-3 print:hidden">
        <button onClick={() => router.push(`/event/${slug}`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm hover:bg-gray-50">
          <ArrowLeft size={15} /> Back to Event
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 ml-auto">
          <Printer size={15} /> Print / Download
        </button>
      </div>

      {/* Ticket Card */}
      <div className="max-w-lg mx-auto bg-white rounded-2xl overflow-hidden shadow-xl print:shadow-none print:rounded-none print:max-w-full">
        {/* Header */}
        <div className="relative p-6" style={{ background: `linear-gradient(135deg, ${ticket.ticket_color || '#6366f1'}, #7c3aed)` }}>
          {ticket.event_logo && (
            <img src={ticket.event_logo} alt="" className="w-12 h-12 rounded-full object-cover mb-3" />
          )}
          <p className="text-white/80 text-xs uppercase tracking-widest mb-1">Event Ticket</p>
          <h1 className="text-white text-2xl font-bold leading-tight">{ticket.event_name}</h1>
          <div className="mt-3 flex flex-wrap gap-3 text-white/80 text-sm">
            {ticket.event_date && <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(ticket.event_date)}</span>}
            {ticket.start_time && <span className="flex items-center gap-1"><Clock size={13} />{formatTime(ticket.start_time)}</span>}
            {ticket.venue_name && <span className="flex items-center gap-1"><MapPin size={13} />{ticket.venue_name}</span>}
          </div>
        </div>

        {/* Zigzag divider */}
        <div className="relative h-4 bg-gray-100">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 0 0, transparent 8px, white 8px) 0 0, radial-gradient(circle at 100% 0, transparent 8px, white 8px) 100% 0', backgroundSize: '20px 100%', backgroundRepeat: 'repeat-x' }} />
        </div>

        {/* Attendee Info */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Attendee</p>
              <p className="font-bold text-gray-900 text-lg">{ticket.attendee_name}</p>
              <p className="text-sm text-gray-500">{ticket.attendee_email}</p>
              {ticket.attendee_phone && <p className="text-sm text-gray-500">{ticket.attendee_phone}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Ticket Type</p>
              <p className="font-bold text-gray-900">{ticket.ticket_name || 'General'}</p>
              <p className="text-sm text-gray-500">₹{ticket.payment_amount || ticket.ticket_price || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Registration #</p>
              <p className="font-mono font-semibold text-gray-900 text-sm">{ticket.registration_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Payment Status</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusColor}`}>
                <PayIcon size={11} />{ticket.payment_status || 'pending'}
              </span>
            </div>
          </div>

          {/* Zigzag divider */}
          <div className="border-t-2 border-dashed border-gray-200 my-4" />

          {/* QR Code */}
          <div className="text-center">
            {ticket.qr_image_url ? (
              <div>
                <img src={ticket.qr_image_url} alt="QR Code" className="w-48 h-48 mx-auto border border-gray-200 rounded-xl" />
                <p className="text-xs text-gray-400 mt-2 font-mono">{ticket.ticket_code}</p>
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">QR code pending</p>
                  <p className="text-xs text-gray-400 mt-1">(Available after payment verification)</p>
                </div>
              </div>
            )}
          </div>

          {/* Venue */}
          {ticket.venue_name && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Venue</p>
              <p className="font-semibold text-gray-900">{ticket.venue_name}</p>
              {ticket.venue_address && <p className="text-sm text-gray-500">{ticket.venue_address}</p>}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
            <p>{settings.ticket_footer_text || 'Thank you for registering!'}</p>
            {ticket.organizer_name && <p className="mt-1">Organized by: {ticket.organizer_name}</p>}
            {ticket.organizer_email && <p>{ticket.organizer_email}</p>}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-ticket, .print-ticket * { visibility: visible; }
        }
      `}</style>
    </div>
  )
}
