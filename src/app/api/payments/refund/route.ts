import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { registration_id, payment_id, amount, reason } = body
    const db = getDb()

    const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id) as any
    if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

    const payment = payment_id
      ? db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id) as any
      : db.prepare('SELECT * FROM payments WHERE registration_id = ?').get(registration_id) as any

    const refundAmount = amount ?? payment?.amount ?? 0
    const refundId = uuidv4()

    db.prepare(`
      INSERT INTO refunds (id, payment_id, registration_id, amount, reason, status, processed_by, processed_at)
      VALUES (?, ?, ?, ?, ?, 'processed', ?, datetime('now'))
    `).run(
      refundId,
      payment?.id || null,
      registration_id,
      refundAmount,
      reason || 'Requested by attendee or organizer cancelled',
      (session.user as any)?.id || null
    )

    if (payment) {
      db.prepare("UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?").run(payment.id)
    }

    db.prepare("UPDATE registrations SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(registration_id)

    // Notify attendee
    const attendee = db.prepare('SELECT * FROM attendees WHERE id = ?').get(reg.attendee_id) as any
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(reg.event_id) as any

    if (attendee && event) {
      db.prepare(`
        INSERT INTO notifications (id, event_id, registration_id, type, subject, message, channel, status, sent_at)
        VALUES (?, ?, ?, 'refund', ?, ?, 'email', 'sent', datetime('now'))
      `).run(
        uuidv4(),
        event.id,
        reg.id,
        `Refund Processed: ${event.name}`,
        `Dear ${attendee.name}, a refund of ₹${refundAmount} for your registration #${reg.registration_number} in "${event.name}" has been initiated. Reason: ${reason || 'Processed by organizer'}.`
      )
    }

    return NextResponse.json({ ok: true, refund_id: refundId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
