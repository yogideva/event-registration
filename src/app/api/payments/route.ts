import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateQRTicket } from '@/lib/qr'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q') || ''
  const eventId = searchParams.get('event_id')
  let sql = `SELECT p.*, r.registration_number, a.name as attendee_name, a.email as attendee_email, e.name as event_name, tt.name as ticket_name FROM payments p JOIN registrations r ON p.registration_id = r.id JOIN attendees a ON r.attendee_id = a.id JOIN events e ON r.event_id = e.id LEFT JOIN ticket_types tt ON r.ticket_type_id = tt.id WHERE 1=1`
  const args: any[] = []
  if (status) { sql += ' AND p.status = ?'; args.push(status) }
  if (eventId) { sql += ' AND e.id = ?'; args.push(eventId) }
  if (q) { sql += ' AND (a.name LIKE ? OR a.email LIKE ? OR r.registration_number LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  sql += ' ORDER BY p.created_at DESC'
  return NextResponse.json(db.prepare(sql).all(...args))
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { payment_id, status, transaction_id, notes } = body
    const db = getDb()
    db.prepare(`UPDATE payments SET status=?, transaction_id=?, notes=?, verified_by=?, verified_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
      .run(status, transaction_id || '', notes || '', (session.user as any).id, payment_id)
    const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(payment_id) as any
    if (status === 'verified') {
      db.prepare("UPDATE registrations SET status='confirmed', updated_at=datetime('now') WHERE id=?").run(payment.registration_id)
      const existingQR = db.prepare('SELECT id FROM qr_tickets WHERE registration_id=?').get(payment.registration_id)
      if (!existingQR) {
        const reg = db.prepare('SELECT * FROM registrations WHERE id=?').get(payment.registration_id) as any
        const event = db.prepare('SELECT * FROM events WHERE id=?').get(reg.event_id) as any
        const attendee = db.prepare('SELECT * FROM attendees WHERE id=?').get(reg.attendee_id) as any
        const ticket = reg.ticket_type_id ? db.prepare('SELECT * FROM ticket_types WHERE id=?').get(reg.ticket_type_id) : null
        await generateQRTicket(db, reg.id, event, attendee, ticket, reg.registration_number)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
