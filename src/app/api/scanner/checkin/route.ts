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
    const { qr_ticket_id, registration_id, event_id, staff_name } = body
    const db = getDb()
    const checkinId = uuidv4()
    db.prepare('INSERT INTO checkins (id, qr_ticket_id, registration_id, event_id, checked_in_by, staff_name) VALUES (?,?,?,?,?,?)')
      .run(checkinId, qr_ticket_id, registration_id, event_id, (session.user as any).id, staff_name || session.user?.name || '')
    return NextResponse.json({ ok: true, checkin_id: checkinId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
