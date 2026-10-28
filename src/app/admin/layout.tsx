'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, CalendarDays, PlusCircle, Users, CreditCard, QrCode,
  BarChart3, Settings, Menu, X, ChevronRight, LogOut, Bell, GripVertical,
  Eye, EyeOff
} from 'lucide-react'
import { cn } from './utils'
import { signOut } from 'next-auth/react'

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, CalendarDays, PlusCircle, Users, CreditCard,
  QrCode, BarChart3, Settings
}

interface SidebarItem {
  id: string; label: string; icon: string; href: string;
  sort_order: number; is_visible: number; badge_key?: string
}

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionResult = typeof useSession === 'function' ? (useSession() || {}) : {}
  const session = (sessionResult as any).data
  const status = (sessionResult as any).status || 'loading'
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [orgName, setOrgName] = useState('EventPro')
  const [orgLogo, setOrgLogo] = useState('')

  useEffect(() => {
    if (pathname !== '/admin/login' && status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router, pathname])

  useEffect(() => {
    if (session) {
      fetch('/api/sidebar').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setSidebarItems(data.filter(i => i.is_visible))
      })
      fetch('/api/settings').then(r => r.json()).then(data => {
        if (data.org_name) setOrgName(data.org_name)
        if (data.org_logo) setOrgLogo(data.org_logo)
      })
    }
  }, [session])

  // If on login page, directly render login content without admin frame
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200 gap-3">
          {orgLogo ? (
            <img src={orgLogo} alt={orgName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{orgName[0]}</span>
            </div>
          )}
          {sidebarOpen && (
            <span className="text-gray-900 font-semibold truncate">{orgName}</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn('ml-auto p-1.5 rounded-md hover:bg-gray-100 text-gray-500', !sidebarOpen && 'mx-auto')}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {sidebarItems.map(item => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm font-medium',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-700 text-xs font-semibold">
                  {session.user?.name?.[0] || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{session.user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="p-1 hover:text-red-500 text-gray-400">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="w-full flex justify-center p-1 hover:text-red-500 text-gray-400">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-16')}>
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 sticky top-0 z-40">
          <div className="flex-1" />
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-700 text-xs font-semibold">{session.user?.name?.[0] || 'A'}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
