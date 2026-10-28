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

        // 1. Check for custom/updated password in database or settings
        try {
          const { getDb } = require('./db')
          const db = getDb()
          const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(credentials.email) as any
          const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password_hash') as any
          const activeHash = (admin && admin.password_hash) ? admin.password_hash : (credentials.email === envEmail && settingRow ? settingRow.value : '')

          if (activeHash) {
            const valid = await bcrypt.compare(credentials.password, activeHash)
            if (valid) {
              return { id: admin?.id || 'admin-system', email: credentials.email, name: admin?.name || 'Administrator', role: admin?.role || 'super_admin' }
            }
            return null
          }
        } catch (e) {
          // DB lookup error ignored
        }

        // 2. Direct default admin fallback if password has not been changed yet
        if (credentials.email === envEmail && credentials.password === envPass) {
          return { id: 'admin-system', email: envEmail, name: 'Administrator', role: 'super_admin' }
        }

        return null
      },
    }),
  ],
}
