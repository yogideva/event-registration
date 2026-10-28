import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { seedDemoData } from '@/lib/seed'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')

  let totalEvents = (db.prepare('SELECT COUNT(*) as c FROM events WHERE status != "cancelled"').get() as any).c
  if (totalEvents === 0) {
    await seedDemoData()
  }

  totalEvents = (db.prepare('SELECT COUNT(*) as c FROM events WHERE status != "cancelled"').get() as any).c
  const publishedEvents = (db.prepare('SELECT COUNT(*) as c FROM events WHERE status = "published"').get() as any).c
  const totalRegistrations = (db.prepare('SELECT COUNT(*) as c FROM registrations WHERE status != "cancelled"').get() as any).c
  const confirmedRegs = (db.prepare('SELECT COUNT(*) as c FROM registrations WHERE status = "confirmed"').get() as any).c
  const pendingPayments = (db.prepare('SELECT COUNT(*) as c FROM payments WHERE status = "pending"').get() as any).c
  const totalRevenue = (db.prepare('SELECT SUM(amount) as s FROM payments WHERE status = "verified"').get() as any).s || 0
  const refunds = (db.prepare('SELECT SUM(amount) as s FROM refunds WHERE status = "processed"').get() as any).s || 0
  const checkins = (db.prepare('SELECT COUNT(*) as c FROM checkins').get() as any).c

  const upcomingEvents = db.prepare(`
    SELECT e.id, e.name, e.date, e.status,
           COUNT(r.id) as registrations
    FROM events e
    LEFT JOIN registrations r ON r.event_id = e.id AND r.status != 'cancelled'
    WHERE e.status = 'published' AND (e.date >= date('now') OR e.date IS NULL)
    GROUP BY e.id ORDER BY e.date LIMIT 5
  `).all()

  const recentRegistrations = db.prepare(`
    SELECT r.registration_number, a.name, a.email, e.name as event_name, r.status, r.created_at
    FROM registrations r
    JOIN attendees a ON r.attendee_id = a.id
    JOIN events e ON r.event_id = e.id
    ORDER BY r.created_at DESC LIMIT 10
  `).all()

  return NextResponse.json({
    totalEvents, publishedEvents, totalRegistrations, confirmedRegs,
    pendingPayments, totalRevenue, refunds, netRevenue: totalRevenue - refunds,
    checkins, upcomingEvents, recentRegistrations
  })
}
