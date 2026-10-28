import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getDb()
    const reg = db.prepare(`
      SELECT r.*, a.name as attendee_name, a.email as attendee_email, e.name as event_name
      FROM registrations r
      JOIN attendees a ON r.attendee_id = a.id
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `).get(params.id) as any

    if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

    const notifId = uuidv4()
    db.prepare(`
      INSERT INTO notifications (id, event_id, registration_id, type, subject, message, channel, status, sent_at)
      VALUES (?, ?, ?, 'confirmation', ?, ?, 'email', 'sent', datetime('now'))
    `).run(
      notifId,
      reg.event_id,
      reg.id,
      `Registration Confirmation: ${reg.event_name}`,
      `Hello ${reg.attendee_name}, this is a copy of your confirmation for ${reg.event_name}. Registration #: ${reg.registration_number}. Current status: ${reg.status}.`
    )

    return NextResponse.json({ ok: true, message: `Confirmation resent to ${reg.attendee_email}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
