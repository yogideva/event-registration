import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; ticketId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  db.prepare('DELETE FROM ticket_types WHERE id=? AND event_id=?').run(params.ticketId, params.id)
  return NextResponse.json({ ok: true })
}
