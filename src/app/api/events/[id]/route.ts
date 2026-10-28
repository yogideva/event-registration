import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { seedDemoData } from '@/lib/seed'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    let event = db.prepare(`
      SELECT e.*, c.name as category_name, c.color as category_color
      FROM events e LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ? OR e.slug = ?
    `).get(params.id, params.id) as any

    if (!event) {
      await seedDemoData()
      event = db.prepare(`
        SELECT e.*, c.name as category_name, c.color as category_color
        FROM events e LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = ? OR e.slug = ?
      `).get(params.id, params.id) as any
    }

    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sections = db.prepare('SELECT * FROM event_sections WHERE event_id = ? ORDER BY sort_order').all(event.id)
    const ticketTypes = db.prepare('SELECT * FROM ticket_types WHERE event_id = ? ORDER BY sort_order').all(event.id)
    const customFields = db.prepare('SELECT * FROM custom_fields WHERE event_id = ? ORDER BY sort_order').all(event.id)
    const media = db.prepare('SELECT * FROM event_media WHERE event_id = ? ORDER BY sort_order').all(event.id)
    const reschedules = db.prepare('SELECT * FROM reschedules WHERE event_id = ? ORDER BY created_at DESC').all(event.id)

    return NextResponse.json({ ...event, sections, ticketTypes, customFields, media, reschedules })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const db = getDb()

    const isCancelling = body.status === 'cancelled'
    const cancellationReason = body.cancellation_reason || ''

    db.prepare(`
      UPDATE events SET
        name=?, category_id=?, description=?, about=?, status=?,
        poster=?, banner=?, logo=?, organizer_logo=?,
        date=?, start_time=?, end_time=?,
        venue_name=?, venue_address=?, maps_link=?,
        organizer_name=?, organizer_phone=?, organizer_email=?,
        registration_start=?, registration_end=?, max_participants=?,
        is_free=?, base_fee=?, currency=?, terms=?, refund_policy=?,
        cancellation_reason=CASE WHEN ? = 'cancelled' THEN ? ELSE cancellation_reason END,
        cancelled_at=CASE WHEN ? = 'cancelled' AND cancelled_at IS NULL THEN datetime('now') ELSE cancelled_at END,
        updated_at=datetime('now')
      WHERE id=?
    `).run(
      body.name, body.category_id || null,
      body.description || '', body.about || '',
      body.status || 'draft',
      body.poster || '', body.banner || '', body.logo || '', body.organizer_logo || '',
      body.date || null, body.start_time || null, body.end_time || null,
      body.venue_name || '', body.venue_address || '', body.maps_link || '',
      body.organizer_name || '', body.organizer_phone || '', body.organizer_email || '',
      body.registration_start || null, body.registration_end || null, body.max_participants || null,
      body.is_free ? 1 : 0, body.base_fee || 0, body.currency || 'INR',
      body.terms || '', body.refund_policy || '',
      body.status, cancellationReason,
      body.status,
      params.id
    )

    // If cancelled, notify attendees
    if (isCancelling) {
      const attendees = db.prepare(`
        SELECT DISTINCT a.email, a.name, r.id as reg_id
        FROM registrations r
        JOIN attendees a ON r.attendee_id = a.id
        WHERE r.event_id = ? AND r.status != 'cancelled'
      `).all(params.id) as any[]

      const insertNotification = db.prepare(`
        INSERT INTO notifications (id, event_id, registration_id, type, subject, message, channel, status, sent_at)
        VALUES (?, ?, ?, 'cancellation', ?, ?, 'email', 'sent', datetime('now'))
      `)

      attendees.forEach(att => {
        insertNotification.run(
          uuidv4(),
          params.id,
          att.reg_id,
          `Event Cancelled: ${body.name}`,
          `Dear ${att.name}, we regret to inform you that ${body.name} has been cancelled. Reason: ${cancellationReason || 'Unforeseen circumstances'}. Any eligible refunds will be processed according to the refund policy.`
        )
      })
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(params.id)
    return NextResponse.json(event)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getDb()
    db.prepare('DELETE FROM events WHERE id = ?').run(params.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
