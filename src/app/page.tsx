'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Shield, ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/admin/login')
    }, 600)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-xl">
          <Calendar className="w-8 h-8 text-indigo-300" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">EventPro Platform</h1>
          <p className="text-indigo-200 mt-2 text-sm">
            Redirecting to Admin Portal...
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Link
            href="/admin/login"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Shield className="w-5 h-5" />
            <span>Open Admin Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/event/global-ai-and-web-summit-2026"
            className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 border border-white/20"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>View Demo Public Event</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
