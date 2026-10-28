import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { generateSlug } from '../utils'
import { seedDemoData } from '../../../lib/seed'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const count = (db.prepare('SELECT COUNT(*) as c FROM events').get() as any).c
    if (count === 0) {
      await seedDemoData()
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q') || ''
    let sql = `SELECT e.*, c.name as category_name, c.color as category_color FROM events e LEFT JOIN categories c ON e.category_id = c.id WHERE 1=1`
    const args: any[] = []
    if (status) { sql += ' AND e.status = ?'; args.push(status) }
    if (q) { sql += ' AND (e.name LIKE ? OR e.description LIKE ?)'; args.push(`%${q}%`, `%${q}%`) }
    sql += ' ORDER BY e.created_at DESC'
    const events = db.prepare(sql).all(...args)
    return NextResponse.json(events)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const db = getDb()
    const id = uuidv4()
    let slug = generateSlug(body.name || 'event')
    const existing = db.prepare('SELECT id FROM events WHERE slug = ?').get(slug)
    if (existing) slug = `${slug}-${Date.now()}`
    db.prepare(`INSERT INTO events (id, slug, name, category_id, description, about, status, poster, banner, logo, organizer_logo, date, start_time, end_time, venue_name, venue_address, maps_link, organizer_name, organizer_phone, organizer_email, registration_start, registration_end, max_participants, is_free, base_fee, currency, terms, refund_policy, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, slug, body.name || 'New Event', body.category_id || null, body.description || '', body.about || '', body.status || 'draft', body.poster || '', body.banner || '', body.logo || '', body.organizer_logo || '', body.date || null, body.start_time || null, body.end_time || null, body.venue_name || '', body.venue_address || '', body.maps_link || '', body.organizer_name || '', body.organizer_phone || '', body.organizer_email || '', body.registration_start || null, body.registration_end || null, body.max_participants || null, body.is_free ? 1 : 0, body.base_fee || 0, body.currency || 'INR', body.terms || '', body.refund_policy || '', (session.user as any).id)
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id)
    return NextResponse.json(event)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
