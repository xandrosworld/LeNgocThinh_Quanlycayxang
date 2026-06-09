export const FUEL_TYPES = {
  D1: { code: 'D1', name: 'Dầu DO (D1)', color: '#f59e0b' },
  E10: { code: 'E10', name: 'Xăng E10', color: '#22c55e' },
  DS: { code: 'DS', name: 'Dầu DS/D5', color: '#3b82f6' },
} as const

export const SHIFT_TIME = {
  START_HOUR: 15, // 15h hôm trước
  END_HOUR: 15,   // 15h hôm sau
}

export const TANK_WARNINGS = {
  LOW: 30,       // dưới 30% - sắp hết
  CRITICAL: 10,  // dưới 10% - nguy hiểm
  HIGH: 90,      // trên 90% - gần đầy
}

export const DEFAULT_DEBT_LIMIT = 50_000_000 // 50 triệu

export const MENU_ITEMS = [
  { href: '/', label: 'Tổng quan', icon: 'dashboard', roles: ['OWNER'] },
  { href: '/shifts', label: 'Chốt ca', icon: 'shifts', roles: ['OWNER', 'EMPLOYEE'] },
  { href: '/debts', label: 'Công nợ', icon: 'debts', roles: ['OWNER'] },
  { href: '/imports', label: 'Nhập hàng', icon: 'imports', roles: ['OWNER'] },
  { href: '/tanks', label: 'Tồn bồn', icon: 'tanks', roles: ['OWNER'] },
  { href: '/expenses', label: 'Chi phí', icon: 'expenses', roles: ['OWNER'] },
  { href: '/reports', label: 'Báo cáo', icon: 'reports', roles: ['OWNER'] },
  { href: '/profit', label: 'Lợi nhuận', icon: 'profit', roles: ['OWNER'] },
  { href: '/ai', label: 'AI nhanh', icon: 'ai', roles: ['OWNER'] },
  { href: '/settings', label: 'Cài đặt', icon: 'settings', roles: ['OWNER'] },
]
