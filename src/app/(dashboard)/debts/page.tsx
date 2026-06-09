'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatVND } from '@/lib/format'
import toast from 'react-hot-toast'

interface CustomerItem {
  id: string
  name: string
  phone: string | null
  debtLimit: number
  currentDebt: number
  note: string | null
  totalNewDebt: number
  totalPayment: number
  debtRatio: number
  debtStatus: 'normal' | 'warning' | 'over'
}

interface DebtSummary {
  totalDebt: number
  customersWithDebt: number
  customersOverLimit: number
  totalCustomers: number
}

export default function DebtsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [summary, setSummary] = useState<DebtSummary>({
    totalDebt: 0,
    customersWithDebt: 0,
    customersOverLimit: 0,
    totalCustomers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDebtLimit, setNewDebtLimit] = useState('50000000')
  const [newNote, setNewNote] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/debts')
      if (!res.ok) throw new Error('Lỗi tải danh sách')
      const data = await res.json()
      setCustomers(data.customers || [])
      setSummary(data.summary || { totalDebt: 0, customersWithDebt: 0, customersOverLimit: 0, totalCustomers: 0 })
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải danh sách công nợ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleCreateCustomer = async () => {
    if (creating) return
    if (!newName.trim()) {
      toast.error('Vui lòng nhập tên khách hàng')
      return
    }
    try {
      setCreating(true)
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          debtLimit: newDebtLimit,
          note: newNote,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi tạo khách hàng')
      }
      toast.success('Đã tạo khách hàng mới!')
      setShowCreateModal(false)
      setNewName('')
      setNewPhone('')
      setNewDebtLimit('50000000')
      setNewNote('')
      await fetchCustomers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi tạo khách hàng'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  )

  const statusBadge = (status: string, ratio: number) => {
    switch (status) {
      case 'over':
        return (
          <span className="badge-danger">
            Vượt hạn mức ({Math.round(ratio)}%)
          </span>
        )
      case 'warning':
        return (
          <span className="badge-warning">
            Gần vượt ({Math.round(ratio)}%)
          </span>
        )
      default:
        return (
          <span className="badge-success">
            Bình thường ({Math.round(ratio)}%)
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Công Nợ</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý công nợ khách hàng</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm khách hàng
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <p className="card-header">Tổng công nợ</p>
            <p className="card-value text-danger-600">{formatVND(summary.totalDebt)}</p>
          </div>
          <div className="card">
            <p className="card-header">Tổng khách hàng</p>
            <p className="card-value">{summary.totalCustomers}</p>
          </div>
          <div className="card">
            <p className="card-header">Khách đang nợ</p>
            <p className="card-value text-warning-600">{summary.customersWithDebt}</p>
          </div>
          <div className="card">
            <p className="card-header">Vượt hạn mức</p>
            <p className="card-value text-danger-600">{summary.customersOverLimit}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm khách hàng theo tên hoặc SĐT..."
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Đang tải danh sách công nợ...</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 text-lg font-medium">
            {searchQuery ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng nào'}
          </p>
          {!searchQuery && (
            <p className="text-gray-400 text-sm mt-1">Nhấn &quot;Thêm khách hàng&quot; để bắt đầu</p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th className="text-right">Nợ phát sinh</th>
                  <th className="text-right">Đã trả</th>
                  <th className="text-right">Dư nợ hiện tại</th>
                  <th className="text-right">Hạn mức</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/debts/${customer.id}`)}
                  >
                    <td>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      {customer.phone && (
                        <div className="text-xs text-gray-400">{customer.phone}</div>
                      )}
                    </td>
                    <td className="text-right font-mono text-danger-600">
                      {formatVND(customer.totalNewDebt)}
                    </td>
                    <td className="text-right font-mono text-success-600">
                      {formatVND(customer.totalPayment)}
                    </td>
                    <td className="text-right font-mono font-bold">
                      {formatVND(customer.currentDebt)}
                    </td>
                    <td className="text-right font-mono text-gray-500">
                      {formatVND(customer.debtLimit)}
                    </td>
                    <td>{statusBadge(customer.debtStatus, customer.debtRatio)}</td>
                    <td className="text-right">
                      <button
                        className="btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/debts/${customer.id}`)
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="card cursor-pointer"
                onClick={() => router.push(`/debts/${customer.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{customer.name}</h3>
                    {customer.phone && (
                      <p className="text-xs text-gray-400">{customer.phone}</p>
                    )}
                  </div>
                  {statusBadge(customer.debtStatus, customer.debtRatio)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nợ phát sinh:</span>
                    <p className="font-mono text-danger-600 font-medium">{formatVND(customer.totalNewDebt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Đã trả:</span>
                    <p className="font-mono text-success-600 font-medium">{formatVND(customer.totalPayment)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Dư nợ hiện tại:</span>
                    <p className="font-mono font-bold text-lg">{formatVND(customer.currentDebt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Hạn mức:</span>
                    <p className="font-mono text-gray-600">{formatVND(customer.debtLimit)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Thêm khách hàng mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Tên khách hàng *</label>
                <input
                  type="text"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên khách hàng..."
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Số điện thoại</label>
                <input
                  type="text"
                  className="input"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0123 456 789"
                />
              </div>

              <div>
                <label className="label">Hạn mức nợ</label>
                <input
                  type="number"
                  className="number-input"
                  value={newDebtLimit}
                  onChange={(e) => setNewDebtLimit(e.target.value)}
                  placeholder="50000000"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Mặc định: {formatVND(50000000)}
                </p>
              </div>

              <div>
                <label className="label">Ghi chú</label>
                <textarea
                  className="input min-h-[60px]"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ghi chú..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost flex-1"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={creating}
                  className="btn-primary flex-1"
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
                    'Tạo khách hàng'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
