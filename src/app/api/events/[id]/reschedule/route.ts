import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const db = getDb()
    const history = db.prepare('SELECT * FROM reschedules WHERE event_id = ? ORDER BY created_at DESC').all(params.id)
    return NextResponse.json(history)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { new_date, new_start_time, new_venue, reason } = body
    const db = getDb()

    const currentEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(params.id) as any
    if (!currentEvent) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const rescheduleId = uuidv4()
    db.prepare(`
      INSERT INTO reschedules (
        id, event_id, previous_date, new_date, previous_start_time, new_start_time,
        previous_venue, new_venue, reason, notified_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(
      rescheduleId,
      params.id,
      currentEvent.date || '',
      new_date || currentEvent.date || '',
      currentEvent.start_time || '',
      new_start_time || currentEvent.start_time || '',
      currentEvent.venue_name || '',
      new_venue || currentEvent.venue_name || '',
      reason || 'Schedule updated by administrator',
      (session.user as any)?.id || null
    )

    // Update event record
    db.prepare(`
      UPDATE events SET
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        venue_name = COALESCE(?, venue_name),
        status = CASE WHEN status = 'published' THEN 'published' ELSE status END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      new_date || null,
      new_start_time || null,
      new_venue || null,
      params.id
    )

    // Log notification record for attendees
    const attendees = db.prepare(`
      SELECT DISTINCT a.email, a.name, r.id as reg_id
      FROM registrations r
      JOIN attendees a ON r.attendee_id = a.id
      WHERE r.event_id = ? AND r.status != 'cancelled'
    `).all(params.id) as any[]

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, event_id, registration_id, type, subject, message, channel, status, sent_at)
      VALUES (?, ?, ?, 'reschedule', ?, ?, 'email', 'sent', datetime('now'))
    `)

    attendees.forEach(att => {
      insertNotification.run(
        uuidv4(),
        params.id,
        att.reg_id,
        `Event Update: ${currentEvent.name} has been rescheduled`,
        `Dear ${att.name}, ${currentEvent.name} has been updated. New Date: ${new_date || currentEvent.date}, Time: ${new_start_time || currentEvent.start_time}, Venue: ${new_venue || currentEvent.venue_name}. Reason: ${reason || 'Updated by organizer'}.`
      )
    })

    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(params.id)
    const history = db.prepare('SELECT * FROM reschedules WHERE event_id = ? ORDER BY created_at DESC').all(params.id)

    return NextResponse.json({ ok: true, event: updatedEvent, history, notifiedCount: attendees.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
