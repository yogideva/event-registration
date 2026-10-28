'use client'
import { useState, useEffect } from 'react'
import { Download, BarChart3, Users, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatCurrency } from '../utils'

export default function ReportsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [eventId, setEventId] = useState('')
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [globalStats, setGlobalStats] = useState<any>(null)

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d : []))
    fetch('/api/dashboard').then(r => r.json()).then(d => setGlobalStats(d))
  }, [])

  useEffect(() => {
    if (!eventId) { setRegistrations([]); setStats(null); return }
    setLoading(true)
    fetch(`/api/registrations?event_id=${eventId}`).then(r => r.json()).then(d => {
      const regs = Array.isArray(d) ? d : []
      setRegistrations(regs)
      // Compute stats
      const total = regs.length
      const confirmed = regs.filter(r => r.status === 'confirmed').length
      const cancelled = regs.filter(r => r.status === 'cancelled').length
      const pending = regs.filter(r => r.status === 'pending').length
      const revenue = regs.filter(r => r.payment_status === 'verified').reduce((s, r) => s + (r.payment_amount || 0), 0)
      // Ticket breakdown
      const ticketMap: Record<string, { count: number; revenue: number }> = {}
      regs.forEach(r => {
        const k = r.ticket_name || 'General'
        if (!ticketMap[k]) ticketMap[k] = { count: 0, revenue: 0 }
        ticketMap[k].count++
        if (r.payment_status === 'verified') ticketMap[k].revenue += r.payment_amount || 0
      })
      setStats({ total, confirmed, cancelled, pending, revenue, ticketBreakdown: ticketMap })
      setLoading(false)
    })
  }, [eventId])

  function exportCSV() {
    if (!registrations.length) return
    const header = ['Reg #', 'Name', 'Email', 'Phone', 'Ticket', 'Status', 'Payment', 'Amount', 'Date']
    const rows = registrations.map(r => [
      r.registration_number, r.attendee_name, r.attendee_email, r.attendee_phone || '',
      r.ticket_name || 'General', r.status, r.payment_status || '', r.payment_amount || 0,
      new Date(r.created_at).toLocaleDateString()
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${eventId}-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">View analytics and export data</p>
        </div>
        {eventId && (
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
              🖨 Print Report
            </button>
          </div>
        )}
      </div>

      {/* Event Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
        <select value={eventId} onChange={e => setEventId(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">— All Events (Overview) —</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {/* Global Stats (no event selected) */}
      {!eventId && globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Events', value: globalStats.totalEvents, icon: BarChart3, color: 'bg-indigo-500' },
            { label: 'Total Registrations', value: globalStats.totalRegistrations, icon: Users, color: 'bg-blue-500' },
            { label: 'Total Revenue', value: `₹${(globalStats.totalRevenue || 0).toLocaleString()}`, icon: CreditCard, color: 'bg-green-500' },
            { label: 'Check-ins', value: globalStats.checkins, icon: CheckCircle, color: 'bg-purple-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={18} className="text-white" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event-specific Report */}
      {eventId && stats && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-indigo-500', icon: Users },
              { label: 'Confirmed', value: stats.confirmed, color: 'bg-green-500', icon: CheckCircle },
              { label: 'Pending', value: stats.pending, color: 'bg-amber-500', icon: Clock },
              { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-500', icon: XCircle },
              { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, color: 'bg-teal-500', icon: CreditCard },
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

          {/* Ticket Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ticket Breakdown</h2>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Ticket Type</th>
                <th className="text-right py-2 text-gray-500 font-medium">Registrations</th>
                <th className="text-right py-2 text-gray-500 font-medium">Revenue</th>
              </tr></thead>
              <tbody>
                {Object.entries(stats.ticketBreakdown).map(([name, data]: any) => (
                  <tr key={name} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{name}</td>
                    <td className="py-3 text-right text-gray-700">{data.count}</td>
                    <td className="py-3 text-right text-gray-700">₹{data.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Registrations Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">All Registrations ({registrations.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Reg #', 'Name', 'Email', 'Phone', 'Ticket', 'Status', 'Payment', 'Amount', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{r.registration_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.attendee_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.attendee_email}</td>
                      <td className="px-4 py-3 text-gray-600">{r.attendee_phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.ticket_name || 'General'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : r.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.payment_status || 'pending'}</span></td>
                      <td className="px-4 py-3 text-gray-700">₹{r.payment_amount || 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}
    </div>
  )
}
