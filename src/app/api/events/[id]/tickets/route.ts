import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const tickets = db.prepare('SELECT * FROM ticket_types WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(tickets)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM ticket_types WHERE event_id = ?').get(params.id) as any)?.m || 0
  db.prepare('INSERT INTO ticket_types (id, event_id, name, description, price, capacity, registration_start, registration_end, benefits, color, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(uuidv4(), params.id, body.name || 'General', body.description || '', body.price || 0, body.capacity || null, body.registration_start || null, body.registration_end || null, body.benefits || '', body.color || '#6366f1', body.is_active !== false ? 1 : 0, maxOrder + 1)
  const tickets = db.prepare('SELECT * FROM ticket_types WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(tickets)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  if (Array.isArray(body)) {
    const update = db.prepare('UPDATE ticket_types SET sort_order=? WHERE id=?')
    body.forEach((t: any, i: number) => update.run(i, t.id))
  } else {
    db.prepare('UPDATE ticket_types SET name=?,description=?,price=?,capacity=?,registration_start=?,registration_end=?,benefits=?,color=?,is_active=? WHERE id=?')
      .run(body.name, body.description || '', body.price || 0, body.capacity || null, body.registration_start || null, body.registration_end || null, body.benefits || '', body.color || '#6366f1', body.is_active ? 1 : 0, body.id)
  }
  const tickets = db.prepare('SELECT * FROM ticket_types WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(tickets)
}
