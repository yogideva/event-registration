import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const db = getDb()
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
    return NextResponse.json(categories)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, color, icon } = body
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim()
    const db = getDb()
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM categories').get() as any)?.m || 0
    db.prepare('INSERT INTO categories (id, name, slug, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), name, slug + '-' + Date.now(), description || '', color || '#6366f1', icon || '', maxOrder + 1)
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
    return NextResponse.json(categories)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
