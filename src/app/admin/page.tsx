'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CalendarDays, Users, CreditCard, TrendingUp, CheckCircle,
  Clock, XCircle, QrCode, ArrowUpRight, PlusCircle, Eye
} from 'lucide-react'
import { formatCurrency, formatDate } from './utils'

interface Stats {
  totalEvents: number; publishedEvents: number; totalRegistrations: number;
  confirmedRegs: number; pendingPayments: number; totalRevenue: number;
  refunds: number; netRevenue: number; checkins: number;
  upcomingEvents: any[]; recentRegistrations: any[]
}

function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('₹')

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
    fetch('/api/settings').then(r => r.json()).then(s => { if (s.currency_symbol) setCurrency(s.currency_symbol) })
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const s = stats!

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening.</p>
        </div>
        <Link href="/admin/events/create" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <PlusCircle size={16} /> Create Event
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Events" value={s.totalEvents} icon={CalendarDays} color="bg-indigo-500" sub={`${s.publishedEvents} published`} />
        <StatCard title="Registrations" value={s.totalRegistrations} icon={Users} color="bg-blue-500" sub={`${s.confirmedRegs} confirmed`} />
        <StatCard title="Pending Payments" value={s.pendingPayments} icon={Clock} color="bg-amber-500" />
        <StatCard title="Net Revenue" value={formatCurrency(s.netRevenue, 'INR', currency)} icon={TrendingUp} color="bg-green-500" sub={`${formatCurrency(s.refunds, 'INR', currency)} refunds`} />
        <StatCard title="Check-ins" value={s.checkins} icon={QrCode} color="bg-purple-500" />
        <StatCard title="Total Revenue" value={formatCurrency(s.totalRevenue, 'INR', currency)} icon={CreditCard} color="bg-teal-500" />
        <StatCard title="Confirmed" value={s.confirmedRegs} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard title="Published Events" value={s.publishedEvents} icon={Eye} color="bg-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/admin/events" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {s.upcomingEvents.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No upcoming events</p>
            )}
            {s.upcomingEvents.map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{ev.name}</p>
                  <p className="text-xs text-gray-500">{ev.date ? formatDate(ev.date) : 'No date set'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-indigo-600">{ev.registrations}</p>
                  <p className="text-xs text-gray-400">registrations</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Registrations</h2>
            <Link href="/admin/registrations" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {s.recentRegistrations.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No registrations yet</p>
            )}
            {s.recentRegistrations.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 text-xs font-bold">{r.name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 truncate">{r.event_name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
