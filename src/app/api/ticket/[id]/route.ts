import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// Public ticket view endpoint (no auth required)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const reg = db.prepare(`
      SELECT r.*, a.name as attendee_name, a.email as attendee_email, a.phone as attendee_phone,
             e.name as event_name, e.date as event_date, e.start_time, e.end_time,
             e.venue_name, e.venue_address, e.organizer_name, e.organizer_email, e.logo as event_logo,
             tt.name as ticket_name, tt.price as ticket_price, tt.color as ticket_color,
             p.status as payment_status, p.amount as payment_amount,
             qt.ticket_code, qt.qr_image_url, qt.id as qr_ticket_id, qt.is_valid
      FROM registrations r
      JOIN attendees a ON r.attendee_id = a.id
      JOIN events e ON r.event_id = e.id
      LEFT JOIN ticket_types tt ON r.ticket_type_id = tt.id
      LEFT JOIN payments p ON p.registration_id = r.id
      LEFT JOIN qr_tickets qt ON qt.registration_id = r.id
      WHERE r.id = ? OR r.registration_number = ? OR qt.ticket_code = ?
    `).get(params.id, params.id, params.id) as any

    if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(reg)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
