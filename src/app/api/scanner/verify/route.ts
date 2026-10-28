import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// QR Scanner endpoint - verify ticket code
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { v4: uuidv4 } = require('uuid')
    const body = await req.json()
    const { ticket_code, qr_data } = body

    const db = getDb()
    let code = ticket_code

    // Parse QR data if raw JSON provided
    if (!code && qr_data) {
      try {
        const parsed = JSON.parse(qr_data)
        code = parsed.ticket_code
      } catch { code = qr_data }
    }

    const qrTicket = db.prepare(`
      SELECT qt.*, r.registration_number, r.status as reg_status, r.event_id, r.custom_field_values,
             a.name as attendee_name, a.email as attendee_email, a.phone as attendee_phone,
             e.name as event_name, e.date as event_date, e.venue_name,
             tt.name as ticket_type, p.status as payment_status, p.amount
      FROM qr_tickets qt
      JOIN registrations r ON qt.registration_id = r.id
      JOIN attendees a ON r.attendee_id = a.id
      JOIN events e ON r.event_id = e.id
      LEFT JOIN ticket_types tt ON r.ticket_type_id = tt.id
      LEFT JOIN payments p ON p.registration_id = r.id
      WHERE qt.ticket_code = ?
    `).get(code) as any

    if (!qrTicket) {
      return NextResponse.json({ valid: false, message: 'Invalid ticket code', status: 'invalid' })
    }

    if (!qrTicket.is_valid) {
      return NextResponse.json({ valid: false, message: 'Ticket has been invalidated', status: 'invalid', ticket: qrTicket })
    }

    if (qrTicket.reg_status === 'cancelled') {
      return NextResponse.json({ valid: false, message: 'Registration has been cancelled', status: 'cancelled', ticket: qrTicket })
    }

    if (qrTicket.payment_status !== 'verified' && qrTicket.payment_status !== 'free') {
      return NextResponse.json({ valid: false, message: 'Payment not verified', status: 'payment_pending', ticket: qrTicket })
    }

    // Check for existing check-in
    const existingCheckin = db.prepare('SELECT * FROM checkins WHERE qr_ticket_id = ?').get(qrTicket.id) as any
    if (existingCheckin) {
      return NextResponse.json({
        valid: false, message: 'Already checked in', status: 'already_checked_in',
        ticket: qrTicket, checkin: existingCheckin
      })
    }

    return NextResponse.json({ valid: true, message: 'Valid ticket', status: 'valid', ticket: qrTicket })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
