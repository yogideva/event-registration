'use client'
import { useState, useEffect } from 'react'
import { Search, Download, Eye, X, CheckCircle, XCircle, Clock, Filter, Printer, Mail, DollarSign, ArrowUpDown, ExternalLink } from 'lucide-react'
import { formatDate, getRegistrationStatusBadge, getPaymentStatusBadge, safeJsonParse } from '../utils'

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [eventId, setEventId] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [viewing, setViewing] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [showRefundModal, setShowRefundModal] = useState<any>(null)
  const [refundReason, setRefundReason] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'attendee_name' | 'payment_amount'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const PER_PAGE = 20

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { load() }, [q, status, eventId])

  function showToastMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (status) p.set('status', status)
    if (eventId) p.set('event_id', eventId)
    fetch(`/api/registrations?${p}`).then(r => r.json()).then(d => {
      setRegistrations(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }

  function exportCSV() {
    const rows = sortedRegistrations.map(r => [
      r.registration_number, r.attendee_name, r.attendee_email, r.attendee_phone || '',
      r.event_name, r.ticket_name || 'General', r.status, r.payment_status || 'pending',
      r.payment_amount || 0, new Date(r.created_at).toLocaleDateString()
    ])
    const header = ['Reg #', 'Name', 'Email', 'Phone', 'Event', 'Ticket', 'Status', 'Payment', 'Amount', 'Date']
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `registrations-${Date.now()}.csv`
    a.click()
  }

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`/api/registrations/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    showToastMsg(`Registration status changed to ${newStatus}`)
    load()
  }

  async function resendConfirmation(id: string) {
    const res = await fetch(`/api/registrations/${id}/notify`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) showToastMsg(data.message || 'Confirmation email sent!')
    else showToastMsg('Failed to send confirmation')
  }

  async function handleRefundSubmit() {
    if (!showRefundModal) return
    const res = await fetch('/api/payments/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_id: showRefundModal.id,
        payment_id: showRefundModal.payment_id,
        amount: showRefundModal.payment_amount,
        reason: refundReason
      })
    })
    const data = await res.json()
    setShowRefundModal(null)
    setRefundReason('')
    if (data.ok) {
      showToastMsg('Refund processed and registration marked cancelled.')
      load()
    } else {
      showToastMsg('Failed to process refund: ' + (data.error || 'Unknown error'))
    }
  }

  const sortedRegistrations = [...registrations].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === 'attendee_name') cmp = (a.attendee_name || '').localeCompare(b.attendee_name || '')
    if (sortBy === 'payment_amount') cmp = (a.payment_amount || 0) - (b.payment_amount || 0)
    return sortOrder === 'asc' ? cmp : -cmp
  })

  const paged = sortedRegistrations.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(sortedRegistrations.length / PER_PAGE)

  return (
    <div className="p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white bg-green-600">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
          <p className="text-sm text-gray-500 mt-1">{registrations.length} total attendees registered</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-700 shadow-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Search attendee name, email, phone, reg#..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={eventId} onChange={e => { setEventId(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Events</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="waitlisted">Waitlisted</option>
        </select>
        <button onClick={() => {
          setSortOrder(so => so === 'asc' ? 'desc' : 'asc')
        }} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50">
          <ArrowUpDown size={14} /> {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Reg #', 'Attendee', 'Event', 'Ticket', 'Status', 'Payment', 'Amount', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading registrations...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No registrations found</td></tr>
              ) : paged.map(r => {
                const sb = getRegistrationStatusBadge(r.status)
                const pb = getPaymentStatusBadge(r.payment_status || 'pending')
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{r.registration_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{r.attendee_name}</p>
                      <p className="text-xs text-gray-500">{r.attendee_email}</p>
                      {r.attendee_phone && <p className="text-xs text-gray-400">{r.attendee_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-36 truncate font-medium">{r.event_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.ticket_name || 'General'}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sb.color}`}>{sb.label}</span></td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${pb.color}`}>{pb.label}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{r.payment_amount || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewing(r)} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg" title="View Details"><Eye size={15} /></button>
                        <button onClick={() => resendConfirmation(r.id)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Resend Confirmation"><Mail size={15} /></button>
                        {r.status !== 'confirmed' && <button onClick={() => updateStatus(r.id, 'confirmed')} className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title="Confirm Registration"><CheckCircle size={15} /></button>}
                        {r.status !== 'cancelled' && (
                          <button onClick={() => setShowRefundModal(r)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg" title="Process Refund / Cancel">
                            <DollarSign size={15} />
                          </button>
                        )}
                        {r.status !== 'cancelled' && <button onClick={() => updateStatus(r.id, 'cancelled')} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Cancel"><XCircle size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Page {page} of {totalPages} ({registrations.length} total)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900 text-lg">Registration Details</h2>
              <button onClick={() => setViewing(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 text-xs">Registration Number</p><p className="font-mono font-bold text-indigo-700">{viewing.registration_number}</p></div>
                <div><p className="text-gray-500 text-xs">Registration Status</p><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRegistrationStatusBadge(viewing.status).color}`}>{viewing.status}</span></div>
                <div><p className="text-gray-500 text-xs">Attendee Name</p><p className="font-bold text-gray-900">{viewing.attendee_name}</p></div>
                <div><p className="text-gray-500 text-xs">Email</p><p className="text-gray-700">{viewing.attendee_email}</p></div>
                <div><p className="text-gray-500 text-xs">Phone</p><p className="text-gray-700">{viewing.attendee_phone || '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Event</p><p className="font-semibold text-gray-900">{viewing.event_name}</p></div>
                <div><p className="text-gray-500 text-xs">Ticket Type</p><p className="font-medium text-gray-800">{viewing.ticket_name || 'General'}</p></div>
                <div><p className="text-gray-500 text-xs">Amount Paid</p><p className="font-bold text-gray-900">₹{viewing.payment_amount || 0}</p></div>
                <div><p className="text-gray-500 text-xs">Payment Status</p><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPaymentStatusBadge(viewing.payment_status || 'pending').color}`}>{viewing.payment_status || 'pending'}</span></div>
                <div><p className="text-gray-500 text-xs">Registered At</p><p className="text-xs text-gray-600">{new Date(viewing.created_at).toLocaleString()}</p></div>
              </div>

              {viewing.custom_field_values && Object.keys(safeJsonParse(viewing.custom_field_values, {})).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Custom Form Responses</p>
                  <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 border border-gray-200">
                    {Object.entries(safeJsonParse(viewing.custom_field_values, {})).map(([k, v]) => (
                      <div key={k} className="text-sm">
                        <span className="text-gray-500 font-medium">{k}: </span>
                        <span className="font-semibold text-gray-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewing.qr_image_url && (
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-2">QR Check-in Ticket</p>
                  <img src={viewing.qr_image_url} alt="QR" className="w-36 h-36 mx-auto border border-gray-300 rounded-lg bg-white p-1" />
                  <p className="font-mono text-xs text-gray-500 mt-1">{viewing.ticket_code}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <a href={`/event/${viewing.event_id}/ticket/${viewing.id}`} target="_blank"
                  className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold text-center hover:bg-indigo-700 flex items-center justify-center gap-1">
                  <ExternalLink size={13} /> Open Ticket Page
                </a>
                <button onClick={() => resendConfirmation(viewing.id)}
                  className="py-2 px-3 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1">
                  <Mail size={13} /> Resend Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Process Refund / Cancellation</h3>
              <button onClick={() => setShowRefundModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600">
              Attendee: <strong>{showRefundModal.attendee_name}</strong><br />
              Amount: <strong>₹{showRefundModal.payment_amount || 0}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Refund</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Attendee requested refund, event reschedule conflict, etc."
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowRefundModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleRefundSubmit} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
