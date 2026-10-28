import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const reg = db.prepare(`
    SELECT r.*, a.name as attendee_name, a.email as attendee_email, a.phone as attendee_phone,
           e.name as event_name, tt.name as ticket_name, tt.price as ticket_price,
           p.status as payment_status, p.amount as payment_amount, p.method as payment_method,
           p.transaction_id, p.payment_proof, p.id as payment_id,
           qt.ticket_code, qt.qr_image_url, qt.id as qr_ticket_id
    FROM registrations r
    JOIN attendees a ON r.attendee_id = a.id
    JOIN events e ON r.event_id = e.id
    LEFT JOIN ticket_types tt ON r.ticket_type_id = tt.id
    LEFT JOIN payments p ON p.registration_id = r.id
    LEFT JOIN qr_tickets qt ON qt.registration_id = r.id
    WHERE r.id = ?
  `).get(params.id)
  if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(reg)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  db.prepare('UPDATE registrations SET status=?, notes=?, updated_at=datetime(\'now\') WHERE id=?')
    .run(body.status, body.notes || '', params.id)
  return NextResponse.json({ ok: true })
}
