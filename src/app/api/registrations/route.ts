import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { generateRegistrationNumber } from '../utils'
import { generateQRTicket } from '../../../lib/qr'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')
  const status = searchParams.get('status')
  const q = searchParams.get('q') || ''
  let sql = `SELECT r.*, a.name as attendee_name, a.email as attendee_email, a.phone as attendee_phone, e.name as event_name, tt.name as ticket_name, tt.price as ticket_price, p.status as payment_status, p.amount as payment_amount, p.method as payment_method, qt.ticket_code, qt.id as qr_ticket_id, qt.qr_image_url FROM registrations r JOIN attendees a ON r.attendee_id = a.id JOIN events e ON r.event_id = e.id LEFT JOIN ticket_types tt ON r.ticket_type_id = tt.id LEFT JOIN payments p ON p.registration_id = r.id LEFT JOIN qr_tickets qt ON qt.registration_id = r.id WHERE 1=1`
  const args: any[] = []
  if (eventId) { sql += ' AND r.event_id = ?'; args.push(eventId) }
  if (status) { sql += ' AND r.status = ?'; args.push(status) }
  if (q) { sql += ' AND (a.name LIKE ? OR a.email LIKE ? OR r.registration_number LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  sql += ' ORDER BY r.created_at DESC'
  const registrations = db.prepare(sql).all(...args)
  return NextResponse.json(registrations)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getDb()
    const { event_id, ticket_type_id, name, email, phone, custom_fields: cfValues } = body

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id) as any
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (event.status !== 'published') return NextResponse.json({ error: 'Event not accepting registrations' }, { status: 400 })

    if (event.max_participants) {
      const count = (db.prepare('SELECT COUNT(*) as c FROM registrations WHERE event_id=? AND status != "cancelled"').get(event_id) as any).c
      if (count >= event.max_participants) return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }

    let attendee = db.prepare('SELECT * FROM attendees WHERE email = ?').get(email) as any
    if (!attendee) {
      const aid = uuidv4()
      db.prepare('INSERT INTO attendees (id, name, email, phone) VALUES (?,?,?,?)').run(aid, name, email, phone || '')
      attendee = db.prepare('SELECT * FROM attendees WHERE id = ?').get(aid) as any
    } else {
      // Update name/phone if provided
      db.prepare('UPDATE attendees SET name=?, phone=? WHERE id=?').run(name, phone || attendee.phone, attendee.id)
    }

    const regId = uuidv4()
    const regNumber = generateRegistrationNumber()
    db.prepare('INSERT INTO registrations (id, registration_number, event_id, attendee_id, ticket_type_id, status, custom_field_values) VALUES (?,?,?,?,?,?,?)')
      .run(regId, regNumber, event_id, attendee.id, ticket_type_id || null, 'pending', JSON.stringify(cfValues || {}))

    const ticket = ticket_type_id ? db.prepare('SELECT * FROM ticket_types WHERE id=?').get(ticket_type_id) as any : null
    const amount = ticket ? ticket.price : (event.is_free ? 0 : event.base_fee)

    const payId = uuidv4()
    db.prepare('INSERT INTO payments (id, registration_id, amount, currency, status) VALUES (?,?,?,?,?)')
      .run(payId, regId, amount, event.currency || 'INR', amount === 0 ? 'free' : 'pending')

    if (amount === 0) {
      db.prepare('UPDATE registrations SET status=? WHERE id=?').run('confirmed', regId)
      await generateQRTicket(db, regId, event, attendee, ticket, regNumber)
    }

    const registration = db.prepare('SELECT * FROM registrations WHERE id=?').get(regId) as any
    const payment = db.prepare('SELECT * FROM payments WHERE registration_id=?').get(regId) as any
    return NextResponse.json({ registration, payment, attendee })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function generateQRTicket(db: any, regId: string, event: any, attendee: any, ticket: any, regNumber: string) {}
