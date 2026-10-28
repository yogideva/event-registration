'use client'
import { useState, useEffect } from 'react'
import { Search, Download, CheckCircle, XCircle, Eye, X, TrendingUp, Clock, CreditCard } from 'lucide-react'
import { formatCurrency, getPaymentStatusBadge } from '../utils'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [eventId, setEventId] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [verifying, setVerifying] = useState<string | null>(null)
  const [txnId, setTxnId] = useState('')
  const [verifyNotes, setVerifyNotes] = useState('')

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { load() }, [q, status, eventId])

  function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (status) p.set('status', status)
    if (eventId) p.set('event_id', eventId)
    fetch(`/api/payments?${p}`).then(r => r.json()).then(d => {
      setPayments(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }

  async function verifyPayment(paymentId: string, newStatus: 'verified' | 'failed') {
    await fetch('/api/payments', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, status: newStatus, transaction_id: txnId, notes: verifyNotes })
    })
    setVerifying(null)
    setTxnId('')
    setVerifyNotes('')
    load()
  }

  // Summary stats
  const totalRevenue = payments.filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0)
  const pendingCount = payments.filter(p => p.status === 'pending').length
  const paidCount = payments.filter(p => p.status === 'paid').length
  const verifiedCount = payments.filter(p => p.status === 'verified').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{payments.length} total payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-500' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-amber-500' },
          { label: 'Submitted (Paid)', value: paidCount, icon: CreditCard, color: 'bg-blue-500' },
          { label: 'Verified', value: verifiedCount, icon: CheckCircle, color: 'bg-indigo-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon size={16} className="text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, reg#..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={eventId} onChange={e => setEventId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Events</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid (Awaiting Verification)</option>
          <option value="verified">Verified</option>
          <option value="failed">Failed/Rejected</option>
          <option value="refunded">Refunded</option>
          <option value="free">Free</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Reg #', 'Attendee', 'Event', 'Ticket', 'Amount', 'Method', 'Transaction ID', 'Status', 'Proof', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No payments found</td></tr>
              ) : payments.map(p => {
                const b = getPaymentStatusBadge(p.status)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.registration_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.attendee_name}</p>
                      <p className="text-xs text-gray-500">{p.attendee_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-28 truncate">{p.event_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.ticket_name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₹{p.amount}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.method || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.transaction_id || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.color}`}>{b.label}</span></td>
                    <td className="px-4 py-3">
                      {p.payment_proof ? (
                        <a href={p.payment_proof} target="_blank" className="text-indigo-600 hover:underline text-xs flex items-center gap-1"><Eye size={12} />View</a>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(p.status === 'pending' || p.status === 'paid') && (
                          <>
                            <button onClick={() => { setVerifying(p.id); setTxnId(p.transaction_id || '') }}
                              className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title="Verify">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => verifyPayment(p.id, 'failed')}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Reject">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify Modal */}
      {verifying && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Verify Payment</h2>
              <button onClick={() => setVerifying(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                <input value={txnId} onChange={e => setTxnId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter transaction/UTR number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2} placeholder="Any notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => verifyPayment(verifying, 'verified')}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Verify & Confirm
                </button>
                <button onClick={() => setVerifying(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
