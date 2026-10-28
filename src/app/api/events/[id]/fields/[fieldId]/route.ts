import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; fieldId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  db.prepare('DELETE FROM custom_fields WHERE id=? AND event_id=?').run(params.fieldId, params.id)
  return NextResponse.json({ ok: true })
}
