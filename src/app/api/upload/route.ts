import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Allow unauthenticated uploads for public registration form (payment proof)
  // Admin uploads require session
  const body = await req.json()
  const { file_base64, filename, folder, is_public } = body

  if (!file_base64 || !filename) {
    return NextResponse.json({ error: 'file_base64 and filename required' }, { status: 400 })
  }

  // Admin-only folders require auth
  const adminFolders = ['poster', 'banner', 'logo', 'organizer-logo', 'qr-image', 'event-images']
  if (adminFolders.includes(folder)) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const uploadsDir = path.resolve(process.cwd(), `public/uploads/${folder || 'misc'}`)
    fs.mkdirSync(uploadsDir, { recursive: true })

    const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    const filePath = path.join(uploadsDir, safeName)

    const base64Data = file_base64.includes(',') ? file_base64.split(',')[1] : file_base64
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buffer)

    const url = `/uploads/${folder || 'misc'}/${safeName}`
    return NextResponse.json({ url, filename: safeName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
