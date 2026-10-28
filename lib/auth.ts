import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from './db'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'eventpro-secret-key-change-in-production',
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/admin/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const envEmail = process.env.ADMIN_EMAIL || 'admin@eventpro.com'
        const envPass = process.env.ADMIN_PASSWORD || 'admin123'

        // 1. Direct validation for default admin - zero database dependency
        if (credentials.email === envEmail && credentials.password === envPass) {
          try {
            const db = getDb()
            let admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(credentials.email) as any
            if (!admin) {
              const hash = await bcrypt.hash(credentials.password, 10)
              db.prepare(`
                INSERT INTO admins (id, email, password_hash, name, role)
                VALUES (?, ?, ?, ?, ?)
              `).run(uuidv4(), credentials.email, hash, 'Administrator', 'super_admin')
            }
          } catch (e) {
            // DB logging error ignored in serverless cold start
          }
          return { id: 'admin-system', email: envEmail, name: 'Administrator', role: 'super_admin' }
        }

        // 2. Fallback check for custom admin users stored in database
        try {
          const db = getDb()
          const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(credentials.email) as any
          if (!admin) return null
          const valid = await bcrypt.compare(credentials.password, admin.password_hash)
          if (!valid) return null
          return { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
        } catch (e) {
          console.error('Auth DB lookup error:', e)
          return null
        }
      },
    }),
  ],
}
