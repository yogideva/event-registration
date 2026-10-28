import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Upload payment proof (base64)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { registration_id, transaction_id, method, payment_proof_base64, filename } = body
    const db = getDb()

    let proofUrl = ''
    if (payment_proof_base64) {
      const fs = require('fs')
      const path = require('path')
      const uploadsDir = path.resolve(process.cwd(), 'public/uploads/payment-proofs')
      fs.mkdirSync(uploadsDir, { recursive: true })
      const ext = filename?.split('.').pop() || 'jpg'
      const fname = `proof-${registration_id}-${Date.now()}.${ext}`
      const buffer = Buffer.from(payment_proof_base64.split(',')[1] || payment_proof_base64, 'base64')
      fs.writeFileSync(path.join(uploadsDir, fname), buffer)
      proofUrl = `/uploads/payment-proofs/${fname}`
    }

    db.prepare(`
      UPDATE payments SET transaction_id=?, method=?, payment_proof=?, status='paid', updated_at=datetime('now')
      WHERE registration_id=?
    `).run(transaction_id || '', method || 'upi', proofUrl, registration_id)

    return NextResponse.json({ ok: true, proof_url: proofUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
