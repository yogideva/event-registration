import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const fields = db.prepare('SELECT * FROM custom_fields WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(fields)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM custom_fields WHERE event_id = ?').get(params.id) as any)?.m || 0
  const fieldName = body.field_name || (body.field_label || 'field').toLowerCase().replace(/\s+/g, '_')
  db.prepare('INSERT INTO custom_fields (id, event_id, field_name, field_label, field_type, description, placeholder, is_required, default_value, options, sort_order, section) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(uuidv4(), params.id, fieldName, body.field_label || 'Field', body.field_type || 'text', body.description || '', body.placeholder || '', body.is_required ? 1 : 0, body.default_value || '', body.options ? JSON.stringify(body.options) : '[]', maxOrder + 1, body.section || 'registration')
  const fields = db.prepare('SELECT * FROM custom_fields WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(fields)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  if (Array.isArray(body)) {
    const update = db.prepare('UPDATE custom_fields SET sort_order=? WHERE id=?')
    body.forEach((f: any, i: number) => update.run(i, f.id))
  } else {
    db.prepare('UPDATE custom_fields SET field_name=?,field_label=?,field_type=?,description=?,placeholder=?,is_required=?,default_value=?,options=?,section=? WHERE id=?')
      .run(body.field_name, body.field_label, body.field_type, body.description || '', body.placeholder || '', body.is_required ? 1 : 0, body.default_value || '', body.options ? JSON.stringify(body.options) : '[]', body.section || 'registration', body.id)
  }
  const fields = db.prepare('SELECT * FROM custom_fields WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(fields)
}
