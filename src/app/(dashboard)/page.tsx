'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatVND, formatLiters, formatDate, formatDateTime } from '@/lib/format'

interface KPI {
  totalRevenueToday: number
  totalDebt: number
  totalTankVolume: number
  shiftsToday: number
}

interface TankData {
  id: string
  name: string
  fuelCode: string
  fuelName: string
  currentVolume: number
  maxCapacity: number
  percentage: number
  warningLow: number
  warningCritical: number
  warningHigh: number
}

interface ShiftData {
  id: string
  shiftDate: string
  startTime: string
  endTime: string | null
  employee?: string
  status: 'OPEN' | 'CLOSED'
  revenue: number
  totalLiters: number
}

interface DebtorData {
  id: string
  name: string
  phone: string | null
  currentDebt: number
  debtLimit: number
}

interface OwnerDashboard {
  role: 'OWNER'
  kpi: KPI
  tanks: TankData[]
  recentShifts: ShiftData[]
  topDebtors: DebtorData[]
}

interface EmployeeDashboard {
  role: 'EMPLOYEE'
  displayName: string
  myShiftsToday: ShiftData[]
  hasOpenShift: boolean
  openShiftId: string | null
}

type DashboardData = OwnerDashboard | EmployeeDashboard

// Skeleton components
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-32" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

function getTankColor(percentage: number, warningCritical: number, warningLow: number, warningHigh: number): string {
  if (percentage <= warningCritical) return 'bg-danger-500'
  if (percentage <= warningLow) return 'bg-warning-500'
  if (percentage >= warningHigh) return 'bg-blue-500'
  return 'bg-success-500'
}

function getTankTextColor(percentage: number, warningCritical: number, warningLow: number, warningHigh: number): string {
  if (percentage <= warningCritical) return 'text-danger-600'
  if (percentage <= warningLow) return 'text-warning-600'
  if (percentage >= warningHigh) return 'text-blue-600'
  return 'text-success-600'
}

const FUEL_COLORS: Record<string, string> = {
  D1: '#f59e0b',
  E10: '#22c55e',
  DS: '#3b82f6',
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          setError('Không thể tải dữ liệu')
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Lỗi kết nối máy chủ')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <KPISkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Tải lại
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  // === EMPLOYEE VIEW ===
  if (data.role === 'EMPLOYEE') {
    const employeeData = data as EmployeeDashboard
    return (
      <div className="space-y-6 animate-slide-in">
        {/* Welcome header */}
        <div className="card bg-gradient-to-r from-primary-500 to-accent-500 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Xin chào,</p>
              <h2 className="text-2xl font-bold">{employeeData.displayName}</h2>
              <p className="text-primary-200 text-sm mt-1">
                {new Date().toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span className="text-5xl">👋</span>
          </div>
        </div>

        {/* Quick action */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Thao tác nhanh</h3>
          {employeeData.hasOpenShift ? (
            <button
              onClick={() => router.push(`/shifts/${employeeData.openShiftId}`)}
              className="btn-accent w-full py-3 text-base"
            >
              🕐 Tiếp tục ca đang mở
            </button>
          ) : (
            <button
              onClick={() => router.push('/shifts/new')}
              className="btn-primary w-full py-3 text-base"
            >
              ➕ Mở ca mới
            </button>
          )}
        </div>

        {/* Today's shifts */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Ca làm hôm nay
          </h3>
          {employeeData.myShiftsToday.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-3xl block mb-2">📋</span>
              <p>Chưa có ca nào hôm nay</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employeeData.myShiftsToday.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => router.push(`/shifts/${shift.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={shift.status === 'OPEN' ? 'badge-warning' : 'badge-success'}>
                        {shift.status === 'OPEN' ? 'Đang mở' : 'Đã chốt'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(shift.startTime)}
                      {shift.endTime ? ` → ${formatDateTime(shift.endTime)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatVND(shift.revenue)}</p>
                    <p className="text-xs text-gray-400">{formatLiters(shift.totalLiters)} lít</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // === OWNER VIEW ===
  const ownerData = data as OwnerDashboard

  return (
    <div className="space-y-6 animate-slide-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue today */}
        <div className="card group">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-header">Doanh thu hôm nay</p>
              <p className="card-value text-primary-500">
                {formatVND(ownerData.kpi.totalRevenueToday)}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              💰
            </div>
          </div>
        </div>

        {/* Total debt */}
        <div className="card group">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-header">Tổng công nợ</p>
              <p className="card-value text-danger-500">
                {formatVND(ownerData.kpi.totalDebt)}
              </p>
            </div>
            <div className="w-10 h-10 bg-danger-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              📊
            </div>
          </div>
        </div>

        {/* Tank volume */}
        <div className="card group">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-header">Tồn kho tổng</p>
              <p className="card-value text-accent-500">
                {formatLiters(ownerData.kpi.totalTankVolume)} <span className="text-sm font-normal text-gray-400">lít</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              ⛽
            </div>
          </div>
        </div>

        {/* Shifts today */}
        <div className="card group">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-header">Số ca hôm nay</p>
              <p className="card-value text-warning-500">
                {ownerData.kpi.shiftsToday} <span className="text-sm font-normal text-gray-400">ca</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🕐
            </div>
          </div>
        </div>
      </div>

      {/* Middle row: Recent Shifts + Tank Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent shifts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Ca gần đây</h3>
            <button
              onClick={() => router.push('/shifts')}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Xem tất cả →
            </button>
          </div>

          {ownerData.recentShifts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-3xl block mb-2">📋</span>
              <p>Chưa có ca nào</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Nhân viên</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerData.recentShifts.map((shift) => (
                    <tr
                      key={shift.id}
                      onClick={() => router.push(`/shifts/${shift.id}`)}
                      className="cursor-pointer"
                    >
                      <td className="whitespace-nowrap">
                        <p className="font-medium text-gray-800">{formatDate(shift.shiftDate)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(shift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td>{shift.employee}</td>
                      <td>
                        <span className={shift.status === 'OPEN' ? 'badge-warning' : 'badge-success'}>
                          {shift.status === 'OPEN' ? 'Đang mở' : 'Đã chốt'}
                        </span>
                      </td>
                      <td className="text-right">
                        <p className="font-semibold text-gray-800">{formatVND(shift.revenue)}</p>
                        <p className="text-xs text-gray-400">{formatLiters(shift.totalLiters)} lít</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tank status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Tồn bồn</h3>
            <button
              onClick={() => router.push('/tanks')}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Chi tiết →
            </button>
          </div>

          {ownerData.tanks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-3xl block mb-2">⛽</span>
              <p>Chưa có dữ liệu bồn</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ownerData.tanks.map((tank) => (
                <div key={tank.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: FUEL_COLORS[tank.fuelCode] || '#6b7280' }}
                      />
                      <span className="font-medium text-gray-800">{tank.name}</span>
                      <span className="text-xs text-gray-400">({tank.fuelName})</span>
                    </div>
                    <span className={`text-sm font-bold ${getTankTextColor(tank.percentage, tank.warningCritical, tank.warningLow, tank.warningHigh)}`}>
                      {tank.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${getTankColor(tank.percentage, tank.warningCritical, tank.warningLow, tank.warningHigh)}`}
                      style={{ width: `${Math.min(tank.percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-gray-400">
                      {formatLiters(tank.currentVolume)} lít
                    </span>
                    <span className="text-xs text-gray-400">
                      / {formatLiters(tank.maxCapacity)} lít
                    </span>
                  </div>

                  {/* Warning badges */}
                  {tank.percentage <= tank.warningCritical && (
                    <div className="mt-2">
                      <span className="badge-danger text-[10px]">⚠️ Nguy hiểm - Sắp hết</span>
                    </div>
                  )}
                  {tank.percentage > tank.warningCritical && tank.percentage <= tank.warningLow && (
                    <div className="mt-2">
                      <span className="badge-warning text-[10px]">⚡ Cần nhập thêm</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Top debtors */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Khách nợ nhiều nhất</h3>
          <button
            onClick={() => router.push('/debts')}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            Xem tất cả →
          </button>
        </div>

        {ownerData.topDebtors.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">✅</span>
            <p>Không có khách nợ</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Điện thoại</th>
                  <th className="text-right">Công nợ</th>
                  <th className="text-right">Hạn mức</th>
                  <th className="text-right">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {ownerData.topDebtors.map((debtor) => {
                  const debtPercent = debtor.debtLimit > 0
                    ? Math.round((debtor.currentDebt / debtor.debtLimit) * 100)
                    : 0
                  return (
                    <tr
                      key={debtor.id}
                      onClick={() => router.push('/debts')}
                      className="cursor-pointer"
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-50 text-primary-500 rounded-lg flex items-center justify-center font-bold text-xs">
                            {debtor.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{debtor.name}</span>
                        </div>
                      </td>
                      <td className="text-gray-500">{debtor.phone || '—'}</td>
                      <td className="text-right">
                        <span className="font-semibold text-danger-600">
                          {formatVND(debtor.currentDebt)}
                        </span>
                      </td>
                      <td className="text-right text-gray-500">{formatVND(debtor.debtLimit)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                debtPercent >= 90 ? 'bg-danger-500' :
                                debtPercent >= 70 ? 'bg-warning-500' :
                                'bg-success-500'
                              }`}
                              style={{ width: `${Math.min(debtPercent, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            debtPercent >= 90 ? 'text-danger-600' :
                            debtPercent >= 70 ? 'text-warning-600' :
                            'text-success-600'
                          }`}>
                            {debtPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
