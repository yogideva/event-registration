import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in to change password.' }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirm password do not match.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 })
    }

    const email = session.user?.email || 'admin@eventpro.com'
    const db = getDb()

    // 1. Verify current password
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email) as any
    const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password_hash') as any
    const activeHash = (admin && admin.password_hash) ? admin.password_hash : (settingRow ? settingRow.value : '')

    let isCurrentValid = false
    if (activeHash) {
      isCurrentValid = await bcrypt.compare(currentPassword, activeHash)
    } else {
      const envPass = process.env.ADMIN_PASSWORD || 'admin123'
      isCurrentValid = (currentPassword === envPass)
    }

    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
    }

    // 2. Hash new password
    const newHash = await bcrypt.hash(newPassword, 10)

    // 3. Update database
    if (admin) {
      db.prepare(`UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE email = ?`).run(newHash, email)
    } else {
      db.prepare(`INSERT INTO admins (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`).run(
        'admin-system',
        email,
        newHash,
        session.user?.name || 'Administrator',
        'super_admin'
      )
    }

    // Also persist in settings table as backup
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('admin_password_hash', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(newHash)

    return NextResponse.json({ ok: true, message: 'Password updated successfully! Please use your new password on your next sign in.' })
  } catch (error: any) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update password.' }, { status: 500 })
  }
}
