'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MENU_ITEMS } from '@/lib/constants'

interface UserInfo {
  id: string
  username: string
  displayName: string
  role: 'OWNER' | 'EMPLOYEE'
}

const ICON_MAP: Record<string, string> = {
  dashboard: '📊',
  shifts: '🕐',
  debts: '💰',
  imports: '🚛',
  tanks: '⛽',
  expenses: '💸',
  reports: '📈',
  profit: '💹',
  ai: '🤖',
  settings: '⚙️',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  // Filter menu items by user role
  const filteredMenuItems = MENU_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <span className="text-3xl">⛽</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed left, Mobile: slide-in drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-xl">
            <span className="text-xl">⛽</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-primary-500 truncate">Quản Lý Cây Xăng</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Huy Thịnh</p>
          </div>
          {/* Close button mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-3">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    router.push(item.href)
                  }}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="text-lg w-6 text-center flex-shrink-0">
                    {ICON_MAP[item.icon] || '📄'}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full" />
                  )}
                </a>
              )
            })}
          </div>
        </nav>

        {/* Sidebar footer - user info */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-primary-50 text-primary-500 rounded-lg font-bold text-sm">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.displayName}</p>
              <p className="text-xs text-gray-400">
                {user.role === 'OWNER' ? 'Chủ cây xăng' : 'Nhân viên'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              {loggingOut ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            {/* Left: hamburger + page title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold text-gray-700">
                {filteredMenuItems.find(
                  (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                )?.label || 'Tổng quan'}
              </h2>
            </div>

            {/* Right: user info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-700">{user.displayName}</p>
                <p className="text-[10px] text-gray-400">
                  {user.role === 'OWNER' ? 'Chủ cây xăng' : 'Nhân viên'}
                </p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-lg font-bold text-sm">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Bottom navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {filteredMenuItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(item.href)
                }}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-0
                  ${isActive
                    ? 'text-primary-500 bg-primary-50'
                    : 'text-gray-400 hover:text-gray-600'
                  }
                `}
              >
                <span className="text-lg">{ICON_MAP[item.icon] || '📄'}</span>
                <span className={`text-[10px] font-medium truncate ${isActive ? 'text-primary-500' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </a>
            )
          })}
          {/* More button if more than 5 items */}
          {filteredMenuItems.length > 5 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-lg">•••</span>
              <span className="text-[10px] font-medium text-gray-500">Thêm</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
