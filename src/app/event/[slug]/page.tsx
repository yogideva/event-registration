'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Phone, Mail, Globe, Share2, Copy, ExternalLink, Users } from 'lucide-react'
import { formatDate, formatTime } from '../utils'

export default function EventPublicPage() {
  const params = useParams()
  const slug = params.slug as string
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/events/${slug}`).then(r => r.json()).then(d => {
      setEvent(d)
      setLoading(false)
    })
  }, [slug])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!event || event.error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-4xl mb-4">😕</p>
        <h1 className="text-2xl font-bold text-gray-900">Event Not Found</h1>
        <p className="text-gray-500 mt-2">This event may not exist or has been removed.</p>
      </div>
    </div>
  )

  if (event.status !== 'published') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-2xl font-bold text-gray-900">Event Not Available</h1>
        <p className="text-gray-500 mt-2">This event is currently {event.status}.</p>
      </div>
    </div>
  )

  const publicUrl = typeof window !== 'undefined' ? window.location.href : ''
  const encodedUrl = encodeURIComponent(publicUrl)
  const encodedName = encodeURIComponent(event.name)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-900 to-purple-900 text-white overflow-hidden">
        {event.banner && <img src={event.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="relative max-w-4xl mx-auto px-4 py-16">
          {event.category_name && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm mb-4" style={{ color: event.category_color || '#fff', background: (event.category_color || '#6366f1') + '33' }}>
              {event.category_name}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">{event.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm opacity-90">
            {event.date && <div className="flex items-center gap-1.5"><Calendar size={15} />{formatDate(event.date)}</div>}
            {event.start_time && <div className="flex items-center gap-1.5"><Clock size={15} />{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</div>}
            {event.venue_name && <div className="flex items-center gap-1.5"><MapPin size={15} />{event.venue_name}</div>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Poster */}
            {event.poster && <img src={event.poster} alt={event.name} className="w-full rounded-xl shadow-md object-cover" />}

            {/* About */}
            {(event.description || event.about) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About the Event</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.about || event.description}</p>
              </div>
            )}

            {/* Custom Sections */}
            {event.sections && event.sections.filter((s: any) => s.is_visible).map((section: any) => (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                {section.content && <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>}
                {section.image_url && <img src={section.image_url} alt={section.title} className="mt-3 w-full rounded-lg" />}
                {section.video_url && (
                  <div className="mt-3 aspect-video">
                    <iframe
                      src={section.video_url.replace('watch?v=', 'embed/')}
                      className="w-full h-full rounded-lg" allowFullScreen
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Tickets */}
            {event.ticketTypes && event.ticketTypes.filter((t: any) => t.is_active).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tickets</h2>
                <div className="space-y-3">
                  {event.ticketTypes.filter((t: any) => t.is_active).map((ticket: any) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300 transition-colors" style={{ borderLeftColor: ticket.color || '#6366f1', borderLeftWidth: 4 }}>
                      <div>
                        <p className="font-semibold text-gray-900">{ticket.name}</p>
                        {ticket.description && <p className="text-sm text-gray-500 mt-0.5">{ticket.description}</p>}
                        {ticket.capacity && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Users size={11} /> {ticket.capacity} seats</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-indigo-600">{ticket.price === 0 ? 'FREE' : `₹${ticket.price}`}</p>
                        <Link href={`/event/${slug}/register?ticket=${ticket.id}`}
                          className="mt-2 inline-block px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                          Register
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Register CTA */}
            <div className="bg-indigo-600 text-white rounded-xl p-5 text-center">
              <p className="font-bold text-lg mb-1">Register Now</p>
              <p className="text-indigo-200 text-sm mb-4">Secure your spot today</p>
              <Link href={`/event/${slug}/register`} className="block w-full bg-white text-indigo-600 py-2.5 rounded-lg font-semibold hover:bg-indigo-50 text-sm">
                Get Tickets →
              </Link>
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Event Details</h3>
              {event.date && (
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-gray-500 text-xs">Date</p><p className="font-medium text-gray-900">{formatDate(event.date)}</p></div>
                </div>
              )}
              {event.start_time && (
                <div className="flex items-start gap-2.5 text-sm">
                  <Clock size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-gray-500 text-xs">Time</p><p className="font-medium text-gray-900">{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</p></div>
                </div>
              )}
              {event.venue_name && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs">Venue</p>
                    <p className="font-medium text-gray-900">{event.venue_name}</p>
                    {event.venue_address && <p className="text-gray-500 text-xs mt-0.5">{event.venue_address}</p>}
                    {event.maps_link && <a href={event.maps_link} target="_blank" className="text-indigo-600 text-xs hover:underline flex items-center gap-0.5 mt-1"><ExternalLink size={11} />View on Maps</a>}
                  </div>
                </div>
              )}
            </div>

            {/* Organizer */}
            {(event.organizer_name || event.organizer_email || event.organizer_phone) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">Organizer</h3>
                {event.organizer_logo && <img src={event.organizer_logo} alt="Organizer" className="h-12 w-auto" />}
                {event.organizer_name && <p className="font-medium text-gray-900">{event.organizer_name}</p>}
                {event.organizer_phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={13} />{event.organizer_phone}</div>}
                {event.organizer_email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={13} />{event.organizer_email}</div>}
              </div>
            )}

            {/* Share */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Share Event</h3>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodedName}%20${encodedUrl}`} target="_blank"
                  className="flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">📱 WhatsApp</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank"
                  className="flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">📘 Facebook</a>
                <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedName}`} target="_blank"
                  className="flex items-center justify-center gap-1.5 py-2 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600">🐦 Twitter</a>
                <a href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedName}`} target="_blank"
                  className="flex items-center justify-center gap-1.5 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600">✈️ Telegram</a>
              </div>
              <button onClick={copyLink} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                <Copy size={13} />{copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
