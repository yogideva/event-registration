'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CreateEventPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/events/new/edit')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Redirecting to event editor...</p>
      </div>
    </div>
  )
}
