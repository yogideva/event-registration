import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const sections = db.prepare('SELECT * FROM event_sections WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(sections)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM event_sections WHERE event_id = ?').get(params.id) as any)?.m || 0
  db.prepare('INSERT INTO event_sections (id, event_id, title, content, type, image_url, video_url, document_url, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(uuidv4(), params.id, body.title || 'New Section', body.content || '', body.type || 'text', body.image_url || '', body.video_url || '', body.document_url || '', maxOrder + 1)
  const sections = db.prepare('SELECT * FROM event_sections WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(sections)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = getDb()
  if (Array.isArray(body)) {
    const update = db.prepare('UPDATE event_sections SET sort_order=? WHERE id=?')
    body.forEach((s: any, i: number) => update.run(i, s.id))
  } else {
    db.prepare('UPDATE event_sections SET title=?,content=?,type=?,image_url=?,video_url=?,document_url=?,is_visible=? WHERE id=?')
      .run(body.title, body.content || '', body.type || 'text', body.image_url || '', body.video_url || '', body.document_url || '', body.is_visible ? 1 : 0, body.id)
  }
  const sections = db.prepare('SELECT * FROM event_sections WHERE event_id = ? ORDER BY sort_order').all(params.id)
  return NextResponse.json(sections)
}
