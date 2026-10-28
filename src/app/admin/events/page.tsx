'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Eye, Edit, Trash2, Share2, Calendar, MapPin, Users, Copy } from 'lucide-react'
import { formatDate, getEventStatusBadge } from '../utils'

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const loadEvents = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    fetch(`/api/events?${params}`).then(r => r.json()).then(d => {
      setEvents(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }

  useEffect(() => { loadEvents() }, [q, status])

  async function deleteEvent(id: string, name: string) {
    if (!confirm(`Delete event "${name}"? This cannot be undone.`)) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    loadEvents()
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/event/${slug}`
    await navigator.clipboard.writeText(url)
    alert('Event link copied!')
  }

  const badge = (status: string) => getEventStatusBadge(status)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">{events.length} events total</p>
        </div>
        <Link href="/admin/events/create" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <PlusCircle size={16} /> Create Event
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Calendar size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No events found</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first event to get started</p>
          <Link href="/admin/events/create" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(ev => {
            const b = badge(ev.status)
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {ev.poster ? (
                  <img src={ev.poster} alt={ev.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <Calendar size={40} className="text-indigo-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{ev.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${b.color}`}>{b.label}</span>
                  </div>
                  {ev.category_name && (
                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">{ev.category_name}</span>
                  )}
                  <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                    {ev.date && <div className="flex items-center gap-1.5"><Calendar size={12} />{formatDate(ev.date)}</div>}
                    {ev.venue_name && <div className="flex items-center gap-1.5"><MapPin size={12} /><span className="truncate">{ev.venue_name}</span></div>}
                  </div>
                  <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100">
                    <Link href={`/admin/events/${ev.id}/edit`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 px-2 py-1.5 hover:bg-indigo-50 rounded-md">
                      <Edit size={13} /> Edit
                    </Link>
                    <Link href={`/event/${ev.slug}`} target="_blank" className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 px-2 py-1.5 hover:bg-green-50 rounded-md">
                      <Eye size={13} /> View
                    </Link>
                    <button onClick={() => copyLink(ev.slug)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1.5 hover:bg-blue-50 rounded-md">
                      <Copy size={13} /> Copy Link
                    </button>
                    <button onClick={() => deleteEvent(ev.id, ev.name)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1.5 hover:bg-red-50 rounded-md ml-auto">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
