'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatVND, formatDateTime } from '@/lib/format'
import toast from 'react-hot-toast'

interface Transaction {
  id: string
  type: 'NEW_DEBT' | 'PAYMENT'
  amount: number
  note: string | null
  createdAt: string
  fuelType: { id: string; code: string; name: string } | null
  shift: {
    id: string
    shiftDate: string
    employee: { displayName: string }
  } | null
}

interface CustomerDetail {
  id: string
  name: string
  phone: string | null
  debtLimit: number
  currentDebt: number
  note: string | null
  totalNewDebt: number
  totalPayment: number
  debtRatio: number
  transactions: Transaction[]
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDebtLimit, setEditDebtLimit] = useState('')
  const [editNote, setEditNote] = useState('')

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/debts/${customerId}`)
      if (!res.ok) throw new Error('Lỗi tải thông tin')
      const data: CustomerDetail = await res.json()
      setCustomer(data)
      setEditName(data.name)
      setEditPhone(data.phone || '')
      setEditDebtLimit(data.debtLimit.toString())
      setEditNote(data.note || '')
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải thông tin khách hàng')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const handleSave = async () => {
    if (saving) return
    if (!editName.trim()) {
      toast.error('Tên khách hàng không được để trống')
      return
    }
    try {
      setSaving(true)
      const res = await fetch(`/api/debts/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          debtLimit: editDebtLimit,
          note: editNote,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi cập nhật')
      }
      toast.success('Đã cập nhật thông tin khách hàng')
      setEditing(false)
      await fetchCustomer()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi cập nhật'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPayment = async () => {
    if (savingPayment) return
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Số tiền phải lớn hơn 0')
      return
    }
    try {
      setSavingPayment(true)
      const res = await fetch('/api/debts/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          type: 'PAYMENT',
          amount: paymentAmount,
          note: paymentNote || 'Trả nợ trực tiếp',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Lỗi ghi nhận trả nợ')
      }
      toast.success('Đã ghi nhận trả nợ thành công!')
      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNote('')
      await fetchCustomer()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi ghi nhận trả nợ'
      toast.error(message)
    } finally {
      setSavingPayment(false)
    }
  }

  const fuelColor = (code: string) => {
    switch (code) {
      case 'D1': return 'bg-amber-100 text-amber-700'
      case 'E10': return 'bg-green-100 text-green-700'
      case 'DS': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">Đang tải thông tin khách hàng...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 text-lg mb-4">Không tìm thấy khách hàng</p>
        <button onClick={() => router.push('/debts')} className="btn-primary">
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const debtPercent = customer.debtLimit > 0 ? (customer.currentDebt / customer.debtLimit) * 100 : 0
  const isOverLimit = debtPercent > 100
  const isWarning = debtPercent > 80 && debtPercent <= 100

  return (
    <div className="space-y-6 animate-slide-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/debts')}
          className="text-sm text-gray-500 hover:text-primary-500 mb-2 inline-flex items-center gap-1"
        >
          ← Danh sách công nợ
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <div className="flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-outline btn-sm">
                ✏️ Sửa thông tin
              </button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} className="btn-ghost btn-sm">
                  Hủy
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-accent btn-sm">
                  {saving ? 'Đang lưu...' : '💾 Lưu'}
                </button>
              </>
            )}
            <button onClick={() => setShowPaymentModal(true)} className="btn-primary btn-sm">
              💵 Ghi nhận trả nợ
            </button>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thông tin khách hàng</h2>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tên khách hàng *</label>
              <input
                type="text"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Số điện thoại</label>
              <input
                type="text"
                className="input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Hạn mức nợ</label>
              <input
                type="number"
                className="number-input"
                value={editDebtLimit}
                onChange={(e) => setEditDebtLimit(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <textarea
                className="input min-h-[60px]"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Tên khách hàng</p>
              <p className="font-medium text-gray-900 text-lg">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Số điện thoại</p>
              <p className="font-medium text-gray-900">
                {customer.phone || <span className="text-gray-400">Chưa có</span>}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hạn mức nợ</p>
              <p className="font-mono font-medium">{formatVND(customer.debtLimit)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ghi chú</p>
              <p className="text-gray-700">{customer.note || <span className="text-gray-400">Không có ghi chú</span>}</p>
            </div>
          </div>
        )}
      </div>

      {/* Debt Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="card-header">Tổng nợ phát sinh</p>
          <p className="card-value text-danger-600 text-lg">{formatVND(customer.totalNewDebt)}</p>
        </div>
        <div className="card">
          <p className="card-header">Tổng đã trả</p>
          <p className="card-value text-success-600 text-lg">{formatVND(customer.totalPayment)}</p>
        </div>
        <div className="card">
          <p className="card-header">Dư nợ hiện tại</p>
          <p className={`card-value text-lg ${isOverLimit ? 'text-danger-600' : 'text-gray-900'}`}>
            {formatVND(customer.currentDebt)}
          </p>
        </div>
        <div className="card">
          <p className="card-header">Tỷ lệ nợ / hạn mức</p>
          <p className={`card-value text-lg ${
            isOverLimit ? 'text-danger-600' : isWarning ? 'text-warning-600' : 'text-success-600'
          }`}>
            {Math.round(debtPercent)}%
          </p>
        </div>
      </div>

      {/* Debt Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Mức nợ hiện tại</span>
          <span className={`text-sm font-medium ${
            isOverLimit ? 'text-danger-600' : isWarning ? 'text-warning-600' : 'text-success-600'
          }`}>
            {formatVND(customer.currentDebt)} / {formatVND(customer.debtLimit)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverLimit ? 'bg-danger-500' : isWarning ? 'bg-warning-500' : 'bg-success-500'
            }`}
            style={{ width: `${Math.min(debtPercent, 100)}%` }}
          />
        </div>
        {isOverLimit && (
          <p className="text-sm text-danger-600 font-medium mt-2">
            ⚠️ Khách hàng đã vượt hạn mức nợ {Math.round(debtPercent - 100)}%
          </p>
        )}
      </div>

      {/* Transaction History */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Lịch sử giao dịch</h2>

        {customer.transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-10">Chưa có giao dịch nào</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Loại</th>
                    <th>Nhiên liệu</th>
                    <th className="text-right">Số tiền</th>
                    <th>Ca</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                      <td>
                        {tx.type === 'NEW_DEBT' ? (
                          <span className="badge-danger">Nợ mới</span>
                        ) : (
                          <span className="badge-success">Trả nợ</span>
                        )}
                      </td>
                      <td>
                        {tx.fuelType ? (
                          <span className={`badge ${fuelColor(tx.fuelType.code)}`}>
                            {tx.fuelType.code}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`text-right font-mono font-medium ${
                        tx.type === 'NEW_DEBT' ? 'text-danger-600' : 'text-success-600'
                      }`}>
                        {tx.type === 'NEW_DEBT' ? '+' : '-'}{formatVND(tx.amount)}
                      </td>
                      <td>
                        {tx.shift ? (
                          <button
                            onClick={() => router.push(`/shifts/${tx.shift!.id}`)}
                            className="text-sm text-primary-500 hover:underline"
                          >
                            {formatDateTime(tx.shift.shiftDate)}
                          </button>
                        ) : (
                          <span className="text-gray-400">Trực tiếp</span>
                        )}
                      </td>
                      <td className="text-gray-500 text-sm">{tx.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {customer.transactions.map((tx) => (
                <div key={tx.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{formatDateTime(tx.createdAt)}</span>
                    {tx.type === 'NEW_DEBT' ? (
                      <span className="badge-danger">Nợ mới</span>
                    ) : (
                      <span className="badge-success">Trả nợ</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tx.fuelType && (
                        <span className={`badge ${fuelColor(tx.fuelType.code)}`}>
                          {tx.fuelType.code}
                        </span>
                      )}
                      {tx.shift && (
                        <button
                          onClick={() => router.push(`/shifts/${tx.shift!.id}`)}
                          className="text-xs text-primary-500 hover:underline"
                        >
                          Ca: {formatDateTime(tx.shift.shiftDate)}
                        </button>
                      )}
                    </div>
                    <span className={`font-mono font-bold text-lg ${
                      tx.type === 'NEW_DEBT' ? 'text-danger-600' : 'text-success-600'
                    }`}>
                      {tx.type === 'NEW_DEBT' ? '+' : '-'}{formatVND(tx.amount)}
                    </span>
                  </div>
                  {tx.note && (
                    <p className="text-xs text-gray-500 mt-2">{tx.note}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Ghi nhận trả nợ</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Dư nợ hiện tại của {customer.name}</p>
                <p className="text-2xl font-bold font-mono text-danger-600">
                  {formatVND(customer.currentDebt)}
                </p>
              </div>

              <div>
                <label className="label">Số tiền trả *</label>
                <input
                  type="number"
                  className="number-input"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  autoFocus
                />
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Dư nợ sau trả: <strong className="text-accent-600">
                      {formatVND(Math.max(0, customer.currentDebt - parseFloat(paymentAmount)))}
                    </strong>
                  </p>
                )}
              </div>

              <div>
                <label className="label">Ghi chú</label>
                <input
                  type="text"
                  className="input"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ghi chú thanh toán..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-ghost flex-1"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={savingPayment}
                  className="btn-accent flex-1"
                >
                  {savingPayment ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    '✅ Xác nhận trả nợ'
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
