'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatVND, formatDateTime, formatLiters, toInputDate } from '@/lib/format'
import toast from 'react-hot-toast'

interface ShiftItem {
  id: string
  shiftDate: string
  startTime: string
  endTime: string | null
  status: 'OPEN' | 'CLOSED'
  employee: {
    id: string
    displayName: string
    username: string
  }
  pumpRevenue: number
  totalLiters: number
  totalRevenue: number
  otherRevenue: number
  cashReceived: number
  bankTransferPersonal: number
  bankTransferBusiness: number
  debtPaymentReceived: number
  _count: {
    debtTransactions: number
    expenses: number
  }
}

export default function ShiftsPage() {
  const router = useRouter()
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/shifts?${params.toString()}`)
      if (!res.ok) throw new Error('Lỗi tải danh sách ca')
      const data = await res.json()
      setShifts(data)
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải danh sách ca')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, dateFrom, dateTo])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  const handleCreateShift = async () => {
    if (creating) return
    try {
      setCreating(true)
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi tạo ca mới')
      }
      const shift = await res.json()
      toast.success('Tạo ca mới thành công!')
      router.push(`/shifts/${shift.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi tạo ca mới'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const clearFilters = () => {
    setFilterStatus('')
    setDateFrom('')
    setDateTo('')
  }

  const today = toInputDate(new Date())

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chốt Ca</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý ca làm việc và chốt doanh thu</p>
        </div>
        <button
          onClick={handleCreateShift}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang tạo...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo ca mới
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="label">Từ ngày</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              max={dateTo || today}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="label">Đến ngày</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              min={dateFrom}
              max={today}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="label">Trạng thái</label>
            <select
              className="input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="OPEN">Đang mở</option>
              <option value="CLOSED">Đã chốt</option>
            </select>
          </div>
          <button onClick={clearFilters} className="btn-ghost btn-sm whitespace-nowrap">
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && shifts.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <p className="card-header">Tổng ca</p>
            <p className="card-value">{shifts.length}</p>
          </div>
          <div className="card">
            <p className="card-header">Đang mở</p>
            <p className="card-value text-blue-600">
              {shifts.filter((s) => s.status === 'OPEN').length}
            </p>
          </div>
          <div className="card">
            <p className="card-header">Tổng doanh thu</p>
            <p className="card-value text-accent-500">
              {formatVND(shifts.reduce((sum, s) => sum + s.totalRevenue, 0))}
            </p>
          </div>
          <div className="card">
            <p className="card-header">Tổng lít bán</p>
            <p className="card-value">
              {formatLiters(shifts.reduce((sum, s) => sum + s.totalLiters, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Đang tải danh sách ca...</p>
          </div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">Chưa có ca nào</p>
          <p className="text-gray-400 text-sm mt-1">Nhấn &quot;Tạo ca mới&quot; để bắt đầu</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày ca</th>
                <th>Nhân viên</th>
                <th>Trạng thái</th>
                <th className="text-right">Tổng lít</th>
                <th className="text-right">Doanh thu</th>
                <th className="text-right">Tiền mặt nhận</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/shifts/${shift.id}`)}
                >
                  <td>
                    <div className="font-medium text-gray-900">
                      {formatDateTime(shift.shiftDate)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {shift.endTime ? `Kết thúc: ${formatDateTime(shift.endTime)}` : 'Chưa kết thúc'}
                    </div>
                  </td>
                  <td>
                    <span className="font-medium">{shift.employee.displayName}</span>
                  </td>
                  <td>
                    {shift.status === 'OPEN' ? (
                      <span className="badge-info">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />
                        Đang mở
                      </span>
                    ) : (
                      <span className="badge-success">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                        Đã chốt
                      </span>
                    )}
                  </td>
                  <td className="text-right font-mono">
                    {formatLiters(shift.totalLiters)}
                  </td>
                  <td className="text-right font-mono font-medium text-accent-600">
                    {formatVND(shift.totalRevenue)}
                  </td>
                  <td className="text-right font-mono">
                    {formatVND(shift.cashReceived)}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/shifts/${shift.id}`)
                      }}
                    >
                      Chi tiết →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
