import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const items = db.prepare('SELECT * FROM sidebar_config ORDER BY sort_order').all()
  return NextResponse.json(items)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  if (Array.isArray(body)) {
    const update = db.prepare('UPDATE sidebar_config SET sort_order=?, is_visible=?, label=? WHERE id=?')
    body.forEach((item: any, i: number) => update.run(i, item.is_visible ? 1 : 0, item.label, item.id))
  }
  return NextResponse.json({ ok: true })
}
